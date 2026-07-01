/**
 * GranWidget.ts
 *
 * Capacitor plugin interface for the GranWatch iOS home-screen widget.
 * The native implementation lives in ios/App/App/GranWidgetPlugin.swift.
 *
 * On web / Android it is a no-op — the widget is iOS-only.
 * On iOS it writes gran data to the shared App Groups UserDefaults
 * (group.app.granwatch) and triggers a WidgetKit timeline reload.
 *
 * Usage:
 *   import { GranWidget } from '@/plugins/GranWidget';
 *   await GranWidget.updateWidgetData({ grans: [...] });
 *
 * Or use the useWidgetSync() hook which handles this automatically.
 */

import { registerPlugin } from '@capacitor/core';

// ─── Data shapes ─────────────────────────────────────────────────────────────

export type GranStatus = 'green' | 'yellow' | 'orange' | 'red';

/** One gran's widget slot — passed to the iOS extension via App Groups. */
export interface GranWidgetEntry {
  /** Elder ID as a string — used as the stable React key */
  id: string;
  /** Display name (gran's first name, used for initials + label) */
  name: string;
  /** Visit status — maps to ring colour */
  status: GranStatus;
  /** Human-readable label, e.g. "Today", "Yesterday", "5 days ago" */
  lastVisitLabel: string;
  /**
   * Ring fill fraction — 0.07 (almost empty = overdue) to 1.0 (full = just visited).
   * Computed by: max(0.07, min(1.0, 1 - daysSinceVisit / alertThresholdDays))
   */
  ringFraction: number;
  /**
   * Absolute URL to the gran's photo (Cloudflare R2), or null.
   * The native plugin downloads this into the App Group container so the
   * widget can render the face offline; falls back to initials when absent.
   */
  photoUrl?: string | null;
}

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface GranWidgetPlugin {
  /**
   * Push the latest gran list to the iOS widget.
   * Pass up to 4 grans (large widget is 2×2).
   * Called automatically by useWidgetSync() whenever elder data changes.
   */
  updateWidgetData(options: { grans: GranWidgetEntry[] }): Promise<{ success: boolean }>;
}

// ─── No-op web implementation ─────────────────────────────────────────────────

const GranWidgetWeb: GranWidgetPlugin = {
  async updateWidgetData() {
    // Widgets are an iOS-only feature; silently ignore on web and Android.
    return { success: false };
  },
};

// ─── Exported singleton ───────────────────────────────────────────────────────

export const GranWidget = registerPlugin<GranWidgetPlugin>('GranWidget', {
  web: GranWidgetWeb,
});
