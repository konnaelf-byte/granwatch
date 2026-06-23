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
import { GranWidget, type GranWidgetEntry, type GranStatus } from '@/plugins/GranWidget';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute how full the ring should be.
 *
 * - 1.0 = visited today (or in the future — shouldn't happen but safe)
 * - 0.07 = at or past the alert threshold (matches the near-empty battery look)
 * - Values in between are a linear interpolation
 */
function computeRingFraction(daysSinceVisit: number, alertThresholdDays: number): number {
  if (daysSinceVisit <= 0) return 1.0;
  const raw = 1.0 - daysSinceVisit / alertThresholdDays;
  return Math.max(0.07, Math.min(1.0, raw));
}

/**
 * Short human-readable label for the widget slot.
 * Kept terse — it's tiny widget real estate.
 */
function buildLastVisitLabel(daysSinceVisit: number): string {
  if (daysSinceVisit <= 0)  return 'Today';
  if (daysSinceVisit === 1) return 'Yesterday';
  if (daysSinceVisit >= 999) return 'No visits yet';
  return `${daysSinceVisit}d ago`;
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
    if (!isNative || !elders || elders.length === 0) return;

    // Widget supports up to 4 slots (2×2 large layout).
    // We pass the first 4 by default — the same order as the dashboard list.
    const grans: GranWidgetEntry[] = elders.slice(0, 4).map((elder) => ({
      id:             String(elder.id),
      name:           elder.name,
      status:         elder.status as GranStatus,
      lastVisitLabel: buildLastVisitLabel(elder.daysSinceVisit),
      ringFraction:   computeRingFraction(elder.daysSinceVisit, elder.alertThresholdDays),
    }));

    GranWidget.updateWidgetData({ grans }).catch((err) => {
      // Non-fatal — widget is a nice-to-have; never crash the main app for it
      console.warn('[GranWidget] Failed to sync widget data:', err);
    });
  }, [elders, isNative]);
}
