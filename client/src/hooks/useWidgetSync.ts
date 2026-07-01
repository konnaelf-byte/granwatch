/**
 * useWidgetSync.ts
 *
 * React hook that bridges the GranWatch app's elder data to the iOS
 * home-screen widget.
 *
 * Call this hook once, high up in the component tree (e.g. in Dashboard.tsx
 * or App.tsx), and it will automatically:
 *
 *   1. Fetch the current elder list via tRPC (only on native iOS)
 *   2. Compute ring fractions + status colours from daysSinceVisit / threshold
 *   3. Push the serialised data to the iOS widget via GranWidget (Capacitor plugin)
 *   4. Re-sync whenever the elder list changes (visit logged, new gran added, etc.)
 *
 * This hook is a no-op on web and Android — Capacitor's plugin shim handles it.
 *
 * Data flow:
 *   tRPC elders.list → ringFraction maths → GranWidget.updateWidgetData()
 *   → GranWidgetPlugin.swift → UserDefaults(group.app.granwatch)
 *   → GranWatchWidget.swift reads + renders on home screen
 */

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { trpc } from '@/lib/trpc';
import { GranWidget, type GranWidgetEntry } from '@/plugins/GranWidget';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: status colour + ring fill are NO LONGER computed here. We send raw
// last-visit dates and the native widget recomputes per day, so the ring
// degrades on its own without the app being opened.

/**
 * TEMP DIAGNOSTIC — report the outcome of each widget-sync attempt to the server
 * so we can see (without device logs) whether the native write ran, how many
 * grans were sent, and any error. Fire-and-forget; never throws.
 */
function reportWidgetSync(data: Record<string, unknown>): void {
  try {
    void fetch('/api/debug/widget-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, platform: Capacitor.getPlatform(), at: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drop this hook into Dashboard.tsx (or any component that's always mounted
 * while the app is in use):
 *
 *   import { useWidgetSync } from '@/hooks/useWidgetSync';
 *
 *   function Dashboard() {
 *     useWidgetSync();
 *     // ... rest of component
 *   }
 */
export function useWidgetSync(): void {
  // Only fetch + sync on native iOS — saves a network round-trip on web
  const isNative = Capacitor.isNativePlatform();

  const { data: elders } = trpc.elders.list.useQuery(undefined, {
    enabled: isNative,
    // Refresh every 5 minutes while the app is in focus so the widget
    // stays current without needing an explicit visit action
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isNative) return;

    // Definitive signal: is the native GranWidget plugin actually registered?
    const pluginAvailable = Capacitor.isPluginAvailable('GranWidget');

    // Report the state so we can see whether the effect ran and had data.
    if (!elders || elders.length === 0) {
      reportWidgetSync({ stage: 'no-elders', granCount: elders?.length ?? -1, pluginAvailable });
      return;
    }

    // Widget supports up to 4 slots (2×2 large layout). Send RAW inputs — the
    // native widget computes status + ring per day, so it self-updates daily.
    const grans: GranWidgetEntry[] = elders.slice(0, 4).map((elder) => ({
      id:                 String(elder.id),
      name:               elder.name,
      lastVisitISO:       elder.lastVisitDate ? new Date(elder.lastVisitDate).toISOString() : null,
      alertThresholdDays: elder.alertThresholdDays,
      photoUrl:           elder.photoUrl ?? null,
    }));

    GranWidget.updateWidgetData({ grans })
      .then((res) => {
        reportWidgetSync({ stage: 'wrote', ok: !!(res && (res as { success?: boolean }).success), granCount: grans.length, pluginAvailable });
      })
      .catch((err) => {
        // Non-fatal — widget is a nice-to-have; never crash the main app for it
        console.warn('[GranWidget] Failed to sync widget data:', err);
        reportWidgetSync({ stage: 'error', ok: false, granCount: grans.length, error: err instanceof Error ? err.message : String(err), pluginAvailable });
      });
  }, [elders, isNative]);
}
