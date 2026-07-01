/**
 * GranWatchWidget.swift
 *
 * iOS home-screen widget — shows a 2×2 grid of circular status rings,
 * one per gran, mirroring the Apple Battery widget aesthetic.
 *
 * Ring fill = visit recency (full green = just visited, thin red = overdue).
 * Initials shown in the centre; gran's name below the ring.
 *
 * Supports: .systemSmall (1 gran), .systemMedium (2 grans), .systemLarge (4 grans).
 *
 * Data source: App Groups UserDefaults (group.app.granwatch)
 * Written by the main GranWatch app via GranWidgetPlugin.swift whenever
 * elder data is loaded or a visit is logged.
 */

import WidgetKit
import SwiftUI
import UIKit
import os.log // TEMP DIAGNOSTIC — remove after widget bridge confirmed

// TEMP DIAGNOSTIC — same subsystem as GranWidgetPlugin so both sides show up in one filter.
// Filter the device console with subsystem:app.granwatch.widget
private let granWidgetLog = OSLog(subsystem: "app.granwatch.widget", category: "widget")

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Shared data model (must match JSON written by GranWidgetPlugin.swift)
// ─────────────────────────────────────────────────────────────────────────────

private let kAppGroup    = "group.app.granwatch"
private let kDataKey     = "granwatch_widget_data"
private let kWidgetKind  = "GranWatchWidget"

struct GranEntry: Codable, Identifiable {
    let id: String
    let name: String
    /// "green" | "yellow" | "orange" | "red"
    let status: String
    let lastVisitLabel: String
    /// 0.07 (almost empty) – 1.0 (full ring, just visited)
    let ringFraction: Double
}

struct WidgetPayload: Codable {
    var grans: [GranEntry]
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Colour helpers
// ─────────────────────────────────────────────────────────────────────────────

private extension GranEntry {
    var ringColor: Color {
        switch status {
        case "green":  return Color(red: 0.30, green: 0.69, blue: 0.31) // #4CAF50
        case "yellow": return Color(red: 1.00, green: 0.76, blue: 0.03) // #FFC107
        case "orange": return Color(red: 1.00, green: 0.50, blue: 0.00) // #FF8000
        default:       return Color(red: 0.96, green: 0.26, blue: 0.21) // #F44336
        }
    }

    var initial: String {
        String(name.prefix(1).uppercased())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Shared UserDefaults reader
// ─────────────────────────────────────────────────────────────────────────────

private func loadPayload() -> WidgetPayload {
    // TEMP DIAGNOSTIC — step through each failure point so the device console reveals
    // exactly where the read breaks (nil suite = App Group not shared with the widget;
    // nil data = app never wrote / wrote to a different suite; decode fail = shape mismatch).
    guard let suite = UserDefaults(suiteName: kAppGroup) else {
        os_log("READ: UserDefaults(suiteName: %{public}@) NIL — widget can't see App Group", log: granWidgetLog, type: .error, kAppGroup)
        return WidgetPayload(grans: [])
    }
    guard let data = suite.data(forKey: kDataKey) else {
        os_log("READ: suite is non-nil but NO data for key %{public}@ — app never wrote here", log: granWidgetLog, type: .error, kDataKey)
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
    WidgetPayload(grans: [
        GranEntry(id: "1", name: "Gran",   status: "green",  lastVisitLabel: "Today",      ringFraction: 0.90),
        GranEntry(id: "2", name: "Nan",    status: "yellow", lastVisitLabel: "3 days ago",  ringFraction: 0.45),
        GranEntry(id: "3", name: "Nana",   status: "red",    lastVisitLabel: "10 days ago", ringFraction: 0.07),
        GranEntry(id: "4", name: "Pop",    status: "green",  lastVisitLabel: "Yesterday",   ringFraction: 0.72),
    ])
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Timeline
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
        let entry   = GranTimelineEntry(date: .now, payload: loadPayload())
        // Refresh every 30 minutes even if the app hasn't updated us
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Ring view (single gran slot)
// ─────────────────────────────────────────────────────────────────────────────

struct GranRingView: View {
    let gran: GranEntry
    let size: CGFloat

    private var strokeWidth: CGFloat { size * 0.115 }
    private var innerSize:   CGFloat { size * 0.54 }

    /// Load a gran's cached photo from the App Group container, if the main app
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
        let grans = entry.payload.grans
        return VStack(spacing: 5) {
            if let g = grans.first {
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
        let grans = entry.payload.grans
        return HStack(spacing: 16) {
            ForEach(0..<2, id: \.self) { i in
                VStack(spacing: 5) {
                    if i < grans.count {
                        GranRingView(gran: grans[i], size: 76)
                        Text(grans[i].name)
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
        let grans  = entry.payload.grans
        let ring: CGFloat = 96

        return LazyVGrid(
            columns: [GridItem(.fixed(ring), spacing: 12),
                      GridItem(.fixed(ring), spacing: 12)],
            spacing: 12
        ) {
            ForEach(0..<4, id: \.self) { i in
                VStack(spacing: 5) {
                    if i < grans.count {
                        GranRingView(gran: grans[i], size: ring)
                        Text(grans[i].name)
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
