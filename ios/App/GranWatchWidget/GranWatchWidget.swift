/**
 * GranWatchWidget.swift
 *
 * iOS home-screen widget — shows circular status rings, one per gran, mirroring
 * the Apple Battery widget aesthetic.
 *
 * SELF-UPDATING: the app writes each gran's raw LAST-VISIT DATE + alert threshold
 * into the App Group. The widget recomputes status colour + ring fill itself, per
 * day, via a 14-day timeline (one entry per midnight). So the ring visibly slips
 * toward red as days pass — with NO app open required. Tap → opens the app.
 *
 * Ring fill = visit recency (full green = just visited, thin red = overdue).
 * Photo (downloaded by the app into the App Group) shown in the centre; initials
 * as fallback; gran's name below.
 *
 * Supports: .systemSmall (1 gran), .systemMedium (2 grans), .systemLarge (4 grans).
 *
 * Data source: App Groups UserDefaults (group.app.granwatch), key granwatch_widget_data.
 */

import WidgetKit
import SwiftUI
import UIKit
import os.log // TEMP DIAGNOSTIC — remove after widget bridge confirmed

// TEMP DIAGNOSTIC — same subsystem as GranWidgetPlugin so both sides show up in one filter.
// Filter the device console with subsystem:app.granwatch.widget
private let granWidgetLog = OSLog(subsystem: "app.granwatch.widget", category: "widget")

private let kAppGroup    = "group.app.granwatch"
private let kDataKey     = "granwatch_widget_data"
private let kWidgetKind  = "GranWatchWidget"

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Stored model (RAW — must match JSON written by GranWidgetPlugin.swift)
// ─────────────────────────────────────────────────────────────────────────────

/// Raw per-gran data as stored by the app. `photoUrl` is present in the JSON but
/// not needed here (Codable ignores it); the photo is loaded from a cached file.
struct GranEntry: Codable, Identifiable {
    let id: String
    let name: String
    /// ISO-8601 date of last visit, or nil if no visits yet.
    let lastVisitISO: String?
    /// Alert threshold in days — drives status + ring computation.
    let alertThresholdDays: Double
}

struct WidgetPayload: Codable {
    var grans: [GranEntry]
}

/// Values computed for a SPECIFIC date — this is what the views render.
struct GranDisplay: Identifiable {
    let id: String
    let name: String
    let status: String        // "green" | "yellow" | "orange" | "red"
    let ringFraction: Double  // 0.07 … 1.0
    let lastVisitLabel: String
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Date + status computation (mirrors server getStatus)
// ─────────────────────────────────────────────────────────────────────────────

private let isoWithFractional: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()
private let isoPlain: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
}()
private func parseISO(_ s: String?) -> Date? {
    guard let s = s else { return nil }
    return isoWithFractional.date(from: s) ?? isoPlain.date(from: s)
}

/// Whole calendar days between the last visit and `date` (>= 0). 999 if no visit.
private func daysSince(_ lastVisit: Date?, on date: Date) -> Int {
    guard let lastVisit = lastVisit else { return 999 }
    let cal = Calendar.current
    let start = cal.startOfDay(for: lastVisit)
    let end   = cal.startOfDay(for: date)
    let d = cal.dateComponents([.day], from: start, to: end).day ?? 999
    return max(0, d)
}

/// Compute a gran's display for a given date. Status thresholds mirror the
/// server's getStatus(): pct<0.33 green, <0.66 yellow, <1 orange, else red.
private func display(for e: GranEntry, on date: Date) -> GranDisplay {
    let lastVisit = parseISO(e.lastVisitISO)
    let hasVisit  = lastVisit != nil
    let days      = daysSince(lastVisit, on: date)
    let threshold = e.alertThresholdDays > 0 ? e.alertThresholdDays : 7
    let pct       = Double(days) / threshold

    let status: String
    if !hasVisit          { status = "red" }
    else if pct < 0.33    { status = "green" }
    else if pct < 0.66    { status = "yellow" }
    else if pct < 1.0     { status = "orange" }
    else                  { status = "red" }

    let ring = hasVisit ? max(0.07, min(1.0, 1.0 - Double(days) / threshold)) : 0.07

    let label: String
    if !hasVisit        { label = "No visits yet" }
    else if days <= 0   { label = "Today" }
    else if days == 1   { label = "Yesterday" }
    else                { label = "\(days)d ago" }

    return GranDisplay(id: e.id, name: e.name, status: status, ringFraction: ring, lastVisitLabel: label)
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Colour helpers
// ─────────────────────────────────────────────────────────────────────────────

private extension GranDisplay {
    var ringColor: Color {
        switch status {
        case "green":  return Color(red: 0.30, green: 0.69, blue: 0.31) // #4CAF50
        case "yellow": return Color(red: 1.00, green: 0.76, blue: 0.03) // #FFC107
        case "orange": return Color(red: 1.00, green: 0.50, blue: 0.00) // #FF8000
        default:       return Color(red: 0.96, green: 0.26, blue: 0.21) // #F44336
        }
    }
    var initial: String { String(name.prefix(1).uppercased()) }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Shared UserDefaults reader
// ─────────────────────────────────────────────────────────────────────────────

private func loadPayload() -> WidgetPayload {
    // TEMP DIAGNOSTIC — step through each failure point (nil suite = App Group not
    // shared with the widget; nil data = app never wrote; decode fail = shape mismatch).
    guard let suite = UserDefaults(suiteName: kAppGroup) else {
        os_log("READ: UserDefaults(suiteName: %{public}@) NIL — widget can't see App Group", log: granWidgetLog, type: .error, kAppGroup)
        return WidgetPayload(grans: [])
    }
    guard let data = suite.data(forKey: kDataKey) else {
        os_log("READ: suite non-nil but NO data for key %{public}@ — app never wrote here", log: granWidgetLog, type: .error, kDataKey)
        return WidgetPayload(grans: [])
    }
    guard let parsed = try? JSONDecoder().decode(WidgetPayload.self, from: data) else {
        os_log("READ: found %{public}d bytes but DECODE failed — JSON shape mismatch", log: granWidgetLog, type: .error, data.count)
        return WidgetPayload(grans: [])
    }
    os_log("READ: OK — %{public}d bytes, decoded %{public}d grans", log: granWidgetLog, type: .info, data.count, parsed.grans.count)
    return parsed
}

private func placeholderPayload() -> WidgetPayload {
    let cal = Calendar.current
    let now = Date()
    func iso(_ daysAgo: Int) -> String {
        isoPlain.string(from: cal.date(byAdding: .day, value: -daysAgo, to: now) ?? now)
    }
    return WidgetPayload(grans: [
        GranEntry(id: "1", name: "Gran", lastVisitISO: iso(0), alertThresholdDays: 7),
        GranEntry(id: "2", name: "Nan",  lastVisitISO: iso(3), alertThresholdDays: 7),
        GranEntry(id: "3", name: "Nana", lastVisitISO: iso(9), alertThresholdDays: 7),
        GranEntry(id: "4", name: "Pop",  lastVisitISO: iso(1), alertThresholdDays: 7),
    ])
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Timeline (one entry per day so the ring self-updates)
// ─────────────────────────────────────────────────────────────────────────────

struct GranTimelineEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload
}

struct GranTimelineProvider: TimelineProvider {

    func placeholder(in context: Context) -> GranTimelineEntry {
        GranTimelineEntry(date: .now, payload: placeholderPayload())
    }

    func getSnapshot(in context: Context, completion: @escaping (GranTimelineEntry) -> Void) {
        let p = context.isPreview ? placeholderPayload() : loadPayload()
        completion(GranTimelineEntry(date: .now, payload: p))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GranTimelineEntry>) -> Void) {
        // Read the raw data ONCE, then emit an entry for now + each of the next 14
        // local midnights. Each entry renders status/ring computed for THAT date,
        // so WidgetKit advances the ring daily on its own (no app open, no network).
        let payload = loadPayload()
        let cal = Calendar.current
        let now = Date()
        var entries: [GranTimelineEntry] = [GranTimelineEntry(date: now, payload: payload)]
        let startToday = cal.startOfDay(for: now)
        for offset in 1...14 {
            if let midnight = cal.date(byAdding: .day, value: offset, to: startToday) {
                entries.append(GranTimelineEntry(date: midnight, payload: payload))
            }
        }
        // .atEnd → after 14 days WidgetKit asks for a fresh timeline (by then the
        // app has usually refreshed the dates anyway).
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Ring view (single gran slot)
// ─────────────────────────────────────────────────────────────────────────────

struct GranRingView: View {
    let gran: GranDisplay
    let size: CGFloat

    private var strokeWidth: CGFloat { size * 0.115 }
    private var innerSize:   CGFloat { size * 0.54 }

    /// Load a gran's cached photo from the App Group container, if the app
    /// has downloaded it (see GranWidgetPlugin.refreshWidgetPhotos).
    static func widgetPhoto(for id: String) -> UIImage? {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: kAppGroup) else { return nil }
        let path = container.appendingPathComponent("widget_photos/gran_\(id).jpg").path
        return UIImage(contentsOfFile: path)
    }

    var body: some View {
        ZStack {
            // Track (dim full circle)
            Circle()
                .stroke(Color.white.opacity(0.10), lineWidth: strokeWidth)

            // Filled arc — clockwise from top
            Circle()
                .trim(from: 0, to: gran.ringFraction)
                .stroke(
                    gran.ringColor,
                    style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Centre: the gran's photo if cached in the App Group, else initials
            ZStack {
                if let photo = Self.widgetPhoto(for: gran.id) {
                    Image(uiImage: photo)
                        .resizable()
                        .scaledToFill()
                        .frame(width: innerSize, height: innerSize)
                        .clipShape(Circle())
                } else {
                    Circle()
                        .fill(gran.ringColor.opacity(0.18))
                        .frame(width: innerSize, height: innerSize)
                    Text(gran.initial)
                        .font(.system(size: innerSize * 0.46, weight: .semibold, design: .rounded))
                        .foregroundColor(gran.ringColor)
                        .accessibilityHidden(true)
                }
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel("\(gran.name): \(gran.status). \(gran.lastVisitLabel).")
    }
}

/// Empty slot — just a dim track, no content
struct EmptyRingView: View {
    let size: CGFloat
    private var strokeWidth: CGFloat { size * 0.115 }

    var body: some View {
        Circle()
            .stroke(Color.white.opacity(0.07), lineWidth: strokeWidth)
            .frame(width: size, height: size)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Widget entry views (one per size family)
// ─────────────────────────────────────────────────────────────────────────────

private let kBg = Color(red: 0.127, green: 0.106, blue: 0.090)

struct GranWatchEntryView: View {
    var entry: GranTimelineEntry
    @Environment(\.widgetFamily) var family

    /// Grans computed for THIS entry's date — this is where the daily update happens.
    private var grans: [GranDisplay] {
        entry.payload.grans.map { display(for: $0, on: entry.date) }
    }

    var body: some View {
        ZStack {
            kBg
            content
        }
        .containerBackground(kBg, for: .widget)
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .systemSmall:  smallView
        case .systemMedium: mediumView
        default:            largeView
        }
    }

    // ── Small: one gran, centred ──────────────────────────────────────────────
    private var smallView: some View {
        let items = grans
        return VStack(spacing: 5) {
            if let g = items.first {
                GranRingView(gran: g, size: 84)
                Text(g.name)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.65))
                    .lineLimit(1)
            } else {
                EmptyRingView(size: 84)
            }
        }
        .padding(10)
    }

    // ── Medium: two grans side by side ───────────────────────────────────────
    private var mediumView: some View {
        let items = grans
        return HStack(spacing: 16) {
            ForEach(0..<2, id: \.self) { i in
                VStack(spacing: 5) {
                    if i < items.count {
                        GranRingView(gran: items[i], size: 76)
                        Text(items[i].name)
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.65))
                            .lineLimit(1)
                    } else {
                        EmptyRingView(size: 76)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
    }

    // ── Large: 2×2 grid — the battery widget layout ───────────────────────────
    private var largeView: some View {
        let items = grans
        let ring: CGFloat = 96

        return LazyVGrid(
            columns: [GridItem(.fixed(ring), spacing: 12),
                      GridItem(.fixed(ring), spacing: 12)],
            spacing: 12
        ) {
            ForEach(0..<4, id: \.self) { i in
                VStack(spacing: 5) {
                    if i < items.count {
                        GranRingView(gran: items[i], size: ring)
                        Text(items[i].name)
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.65))
                            .lineLimit(1)
                    } else {
                        EmptyRingView(size: ring)
                    }
                }
            }
        }
        .padding(14)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Widget definition
// ─────────────────────────────────────────────────────────────────────────────

@main
struct GranWatchWidget: Widget {
    let kind = kWidgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GranTimelineProvider()) { entry in
            GranWatchEntryView(entry: entry)
        }
        .configurationDisplayName("GranWatch")
        .description("See how recently each gran has been visited — at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()   // Remove system padding — we control our own
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Previews
// ─────────────────────────────────────────────────────────────────────────────

#Preview("Small",  as: .systemSmall)  { GranWatchWidget() } timeline: { GranTimelineEntry(date: .now, payload: placeholderPayload()) }
#Preview("Medium", as: .systemMedium) { GranWatchWidget() } timeline: { GranTimelineEntry(date: .now, payload: placeholderPayload()) }
#Preview("Large",  as: .systemLarge)  { GranWatchWidget() } timeline: { GranTimelineEntry(date: .now, payload: placeholderPayload()) }
