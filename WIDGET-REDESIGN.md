# Widget Redesign — self-updating daily status ring (Build 9)

**Why:** The widget's whole value is that a gran's ring visibly slips toward red over time, pulling a family member to tap it and open the app. The current design **cannot do this**:
1. It only writes data when the app is opened (`useWidgetSync` on Dashboard).
2. It stores a **pre-computed** `status` + `ringFraction`, so the widget just re-serves a frozen snapshot. Between app opens the ring never changes.

**Goal:** the ring degrades **daily on its own**, no app open required. Achieved by storing raw last-visit dates and letting the widget recompute per day via a WidgetKit timeline with one entry per day.

---

## Two problems to fix in Build 9
### A. Data must actually reach the shared container (currently blank)
- Confirmed already: native side is correct — `GranWidgetPlugin` is compiled + registered, App Group `group.app.granwatch` is provisioned on **both** the app and widget (verified in the signed Build 8 archive), keys/suite names match.
- Yet the widget shows the empty state and the `/api/debug/widget-sync` report came back `null` (no write reported).
- **Investigate:** (1) Railway may run >1 replica, so the in-memory diagnostic on one replica isn't seen by the GET on another — make the diagnostic DB-backed or read Railway logs (`console.log("[WidgetSync]", …)` is already emitted). (2) Service-worker may be serving a stale JS chunk on device — bump `sw.js` `CACHE_VERSION` to force-bust. (3) Confirm `GranWidget.updateWidgetData` actually resolves on device (add a one-shot visible in-app indicator if needed).

### B. Redesign for daily self-update
**Payload (app → container), raw inputs instead of pre-computed:**
```ts
interface GranWidgetEntry {
  id: string;
  name: string;
  lastVisitISO: string | null;   // absolute date of last visit (or null = no visits)
  alertThresholdDays: number;    // used to compute status + ring
  photoUrl?: string | null;
}
```
- `useWidgetSync` maps `lastVisitISO: elder.lastVisitDate ? new Date(elder.lastVisitDate).toISOString() : null` and `alertThresholdDays: elder.alertThresholdDays`. (`elders.list` already returns both.)
- `GranWidgetPlugin.swift` needs **no change** — it stores whatever JSON it's given, and the photo download only reads `id` + `photoUrl` (both still present).

**Widget (`GranWatchWidget.swift`) — compute per date + daily timeline:**
- `GranEntry` stores `id, name, lastVisitISO, alertThresholdDays, photoUrl`.
- Add `func display(on date: Date)` computing, for that date:
  - `daysSince = calendar days between lastVisit and date` (999 if nil)
  - `ringFraction = max(0.07, min(1.0, 1 - daysSince / alertThresholdDays))`
  - `status` = mirror the server's `getStatus(daysSince, threshold)` thresholds exactly (green/yellow/orange/red) — copy the boundaries from `server/routers.ts`.
  - `lastVisitLabel` = "Today"/"Yesterday"/"Nd ago"/"No visits yet"
- `getTimeline`: build **one entry per local midnight for the next ~14 days**, each carrying the grans' values computed for that day. Policy `.atEnd`. WidgetKit advances through them automatically → ring updates daily with no app open, no network, within budget.
- Keep the photo render (circular photo, initials fallback) + the diagnostic `os_log` lines until confirmed.

**Result:** app seeds last-visit dates once; the widget degrades the ring daily by itself. When a visit is logged and the app is next opened, the dates refresh.

---

## Sequencing
Build 9 = push (Firebase) **+** this widget redesign. Both are native. Do the write-path confirmation (A) first so we know the seed data lands, then ship the timeline redesign (B). Verify on device: set a gran's last visit several days back and confirm the ring is not full; leave the app closed overnight and confirm the ring steps down the next day.
