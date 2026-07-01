/**
 * GranWidgetPlugin.swift
 *
 * Capacitor plugin — bridge between the GranWatch JS/React layer and
 * the iOS home-screen widget.
 *
 * Called from useWidgetSync.ts whenever elder data loads or changes.
 * Writes the serialised gran list to the App Groups shared UserDefaults
 * so the WidgetKit extension can read it without needing network access.
 *
 * Usage (from TypeScript):
 *   import { GranWidget } from '@/plugins/GranWidget';
 *   await GranWidget.updateWidgetData({ grans: [...] });
 */

import Foundation
import Capacitor
import WidgetKit
import UIKit
import os.log // TEMP DIAGNOSTIC — remove after widget bridge confirmed

// TEMP DIAGNOSTIC — dedicated log handle so lines are easy to filter in Console.app
// Filter the device console with subsystem:app.granwatch.widget  (or category:bridge)
private let granLog = OSLog(subsystem: "app.granwatch.widget", category: "bridge")

@objc(GranWidgetPlugin)
public class GranWidgetPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "GranWidgetPlugin"
    public let jsName     = "GranWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise),
    ]

    private let appGroup  = "group.app.granwatch"
    private let dataKey   = "granwatch_widget_data"
    private let widgetKind = "GranWatchWidget"

    /// Receives { grans: GranEntry[] } from the JS layer.
    /// Encodes to JSON and stores in the shared App Groups UserDefaults,
    /// then tells WidgetKit to reload all GranWatch timelines.
    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let gransArray = call.getArray("grans") else {
            // TEMP DIAGNOSTIC
            os_log("WRITE: rejected — missing 'grans' parameter", log: granLog, type: .error)
            call.reject("Missing 'grans' parameter")
            return
        }

        // TEMP DIAGNOSTIC — confirm the JS layer actually called us and how many grans arrived
        os_log("WRITE: updateWidgetData called with %{public}d grans", log: granLog, type: .info, gransArray.count)

        // Wrap inside the same envelope the widget reads: { grans: [...] }
        let payload: [String: Any] = ["grans": gransArray]

        // TEMP DIAGNOSTIC — separate the two guard failures so we know WHICH one fired.
        // A nil suite here is the classic symptom of the App Group capability NOT being
        // provisioned in the signing profile (entitlement present in file but not enabled).
        let jsonData = try? JSONSerialization.data(withJSONObject: payload)
        if jsonData == nil {
            os_log("WRITE: FAILED to serialise payload to JSON", log: granLog, type: .error)
        }
        let suite = UserDefaults(suiteName: appGroup)
        if suite == nil {
            os_log("WRITE: UserDefaults(suiteName: %{public}@) returned NIL — App Group likely NOT provisioned", log: granLog, type: .error, appGroup)
        } else {
            os_log("WRITE: UserDefaults(suiteName: %{public}@) is non-nil ✓", log: granLog, type: .info, appGroup)
        }

        guard
            let jsonData = jsonData,
            let suite    = suite
        else {
            call.reject("Failed to serialise widget data or access App Group")
            return
        }

        suite.set(jsonData, forKey: dataKey)
        suite.synchronize()

        // TEMP DIAGNOSTIC — confirm bytes written + immediate read-back from the same suite
        let readBack = suite.data(forKey: dataKey)?.count ?? -1
        os_log("WRITE: wrote %{public}d bytes for key %{public}@; read-back = %{public}d bytes",
               log: granLog, type: .info, jsonData.count, dataKey, readBack)

        // Tell WidgetKit the data has changed — reloads timeline immediately
        // (rings, names, and any already-cached photos update right away).
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        // TEMP DIAGNOSTIC
        os_log("WRITE: reloadTimelines(ofKind: %{public}@) requested", log: granLog, type: .info, widgetKind)

        // Resolve immediately — photo downloads run in the background below.
        call.resolve(["success": true])

        // Cache each gran's photo into the shared container, then reload once more
        // so the faces appear. Non-blocking and non-fatal: a failed download simply
        // leaves the initials fallback in place.
        refreshWidgetPhotos((call.getArray("grans") as? [JSObject]) ?? [])
    }

    /// Download each gran's photo into the App Group container as `widget_photos/gran_<id>.jpg`
    /// so the WidgetKit extension can render the face offline. Skips photos that were
    /// refreshed less than 6 hours ago to avoid re-fetching on every sync.
    private func refreshWidgetPhotos(_ grans: [JSObject]) {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
            os_log("PHOTO: App Group container URL nil — cannot cache photos", log: granLog, type: .error)
            return
        }
        let photosDir = container.appendingPathComponent("widget_photos", isDirectory: true)
        try? FileManager.default.createDirectory(at: photosDir, withIntermediateDirectories: true)

        let group = DispatchGroup()
        var changed = false
        let lock = NSLock()

        for obj in grans {
            guard let id = obj["id"] as? String,
                  let urlString = obj["photoUrl"] as? String,
                  !urlString.isEmpty,
                  let url = URL(string: urlString) else { continue }

            let dest = photosDir.appendingPathComponent("gran_\(id).jpg")

            // Skip if refreshed recently (avoid hammering R2 on every 5-min sync).
            if let attrs = try? FileManager.default.attributesOfItem(atPath: dest.path),
               let modified = attrs[.modificationDate] as? Date,
               Date().timeIntervalSince(modified) < 6 * 3600 {
                continue
            }

            group.enter()
            URLSession.shared.dataTask(with: url) { data, _, _ in
                defer { group.leave() }
                guard let data = data, UIImage(data: data) != nil else { return }
                if (try? data.write(to: dest, options: .atomic)) != nil {
                    lock.lock(); changed = true; lock.unlock()
                }
            }.resume()
        }

        group.notify(queue: .main) { [weak self] in
            guard let self = self, changed else { return }
            WidgetCenter.shared.reloadTimelines(ofKind: self.widgetKind)
            os_log("PHOTO: photos refreshed — widget reloaded", log: granLog, type: .info)
        }
    }
}
