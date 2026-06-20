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
            call.reject("Missing 'grans' parameter")
            return
        }

        // Wrap inside the same envelope the widget reads: { grans: [...] }
        let payload: [String: Any] = ["grans": gransArray]

        guard
            let jsonData = try? JSONSerialization.data(withJSONObject: payload),
            let suite    = UserDefaults(suiteName: appGroup)
        else {
            call.reject("Failed to serialise widget data or access App Group")
            return
        }

        suite.set(jsonData, forKey: dataKey)
        suite.synchronize()

        // Tell WidgetKit the data has changed — reloads timeline immediately.
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)

        call.resolve(["success": true])
    }
}
