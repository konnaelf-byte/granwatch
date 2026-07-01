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

/**
 * One gran's widget slot — RAW inputs only. The native widget recomputes the
 * status colour + ring fill itself, per day, so the ring degrades over time
 * with NO app open required. (Previously we sent a pre-computed status/ring,
 * which froze the widget between app opens — defeating the whole purpose.)
 */
export interface GranWidgetEntry {
  /** Elder ID as a string — stable key + photo filename */
  id: string;
  /** Display name (gran's first name, used for initials + label) */
  name: string;
  /** ISO-8601 date of the last visit, or null if no visits yet. */
  lastVisitISO: string | null;
  /** Alert threshold in days — the widget uses this to compute status + ring. */
  alertThresholdDays: number;
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
