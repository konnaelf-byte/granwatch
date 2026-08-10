# Feature Spec — Custom Care Counters (Gran+)
*Konstand's idea, 2026-08-10. Parked for the next feature update. Coach-assessed: strong — it generalises the app's core mechanic (days-since-X vs a threshold) into user-defined commitments, and it absorbs the earlier parked "visit types" idea (a phone-call commitment is just a private counter).*

## The idea in one line
Gran+ families can add **one or two custom counters** per gran: a named (or emoji-labelled) commitment with a chosen interval in days, shown as a **horizontal status bar** (deliberately different from the family visit ring), with overdue notifications — either **private to one member** or **shared by the whole family**.

## Examples (from Konstand)
- Private: "📱 Text Gran" every 7 days — one member's personal commitment, invisible to the rest of the family.
- Shared: "🚗 Day trip" every ~91 days (4×/year) — whole family works toward it together, anyone can log it.

## Model
`elderCounters`: id, elderId, name (≤30), emoji (single, optional — used as the icon), intervalDays (1–365), scope ('private'|'family'), ownerUserId (for private), createdByUserId, isActive.
`counterLogs`: id, counterId, elderId, loggedByUserId, loggedAt, note (optional).
Status = same banding as the ring: pct = daysSinceLastLog / intervalDays → green <0.33, yellow <0.66, orange <1, red ≥1. "Never logged" = neutral grey.

## UI
- **Horizontal bar** (not a ring): emoji/name left, slim progress bar draining left→right with status colour, "X days since" right, one-tap "Log it 💚" button. Lives on the elder profile under the main ring; private counters render only for their owner with a small lock glyph.
- Create flow: name or emoji picker, interval (slider or presets: weekly / fortnightly / monthly / quarterly + custom days), private/family toggle. Cap: 2 counters per elder (v1), Gran+ gated like Care.
- **iOS widget**: counter renders as its emoji inside the same draining ring treatment, in place of a profile photo. ⚠️ Widget part = native SwiftUI change → requires an app-store build (14+); everything else ships live via server.url.

## Notifications
Reuse the nightly 20:00 cron: when a counter crosses its interval (once per crossing, sentinel like nudges): private → push/email only the owner; family → the longest-absent logger (mirror the visit-nudge philosophy), escalate to whole family at 1.5× interval. No new infra.

## Why it's good for the business
- Deepens Gran+ value (retention lever for the 120-day trial → paid conversion).
- Private counters extend the "personal conscience" concept the flip counter started — same emotional engine, user-defined.
- Shared goals create family coordination moments = organic invites.

## Open decisions before build
1. Does logging a counter create a feed/visit-log entry the family sees? (Private ones must NOT.)
2. Should a logged VISIT auto-count toward any counter? (Suggest: no — counters are for the things a visit isn't.)
3. Free tier: show a locked teaser bar or hide entirely? (Suggest: teaser, consistent with Care panel.)
4. Widget: does a private counter belong on a shared family device's widget? (Suggest: widget shows it — the widget is per-device/per-user account anyway.)

## Build estimate
Server + web UI + notifications: one focused session (migration, router, panel, cron hook). Widget emoji rendering: rides along with the next iOS build (14). No store review needed for the web/server part.
