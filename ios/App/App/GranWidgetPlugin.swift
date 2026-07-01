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

        // Tell WidgetKit the data has changed — reloads timeline immediately.
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        // TEMP DIAGNOSTIC
        os_log("WRITE: reloadTimelines(ofKind: %{public}@) requested", log: granLog, type: .info, widgetKind)

        call.resolve(["success": true])
    }
}
