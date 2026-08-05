# GranWatch — SCALE GAMEPLAN
*Design around the spike, not the average day. Written 2026-08-05. Review when a tripwire fires, not before.*

## The events that synchronise OUR users (protect these moments)
1. **The 20:00 SAST nightly notification blast** — the app's own load-shedding stage change. MITIGATED 2026-08-05: sends are shuffled + jittered across up to 15 min (`server/cron.ts`).
2. **Weekend evenings** — families log visits after Sunday visits. Natural peak, ~5-10× weekday.
3. **A viral moment** — OFW post takes off, press, Apple featuring. Signup spike hits Clerk (auth) + Resend (OTP emails) + Railway simultaneously.
4. **Trial-expiry waves** — 180 days after each big activation burst, that cohort's lock+subscribe moment lands together. (First wave: ~late Jan 2027.)

## TRIPWIRES — exact numbers, exact interventions, exact costs

### T1 — email ceiling (FIRST thing that breaks; blocks SIGNUPS mid-spike)
- **Watch:** Resend dashboard → emails sent/day. Free tier ≈ **100/day, 3,000/mo**.
- **Tripwire: 60 emails in one day** (nightly digest + OTPs + reminders compound fast).
- **Intervention:** upgrade Resend → Pro, **$20/mo** (≈50k emails/mo). 5-minute dashboard change, zero code.
- **VERIFIED 2026-08-05:** sign-in OTP emails are sent by **Clerk's mailer**, not Resend (`server/email.ts` carries only notification/digest mail). A Resend cap therefore delays nudge emails but can NOT block signups. Remaining verify: which Resend plan we're on (dashboard).

### T2 — server saturation
- **Watch:** Railway → service metrics, weekly glance. p95 response time + CPU.
- **Tripwire: p95 > 500ms sustained for a day, or CPU > 70% at the 20:00 peak.**
- **Intervention (in order):** (a) bump service resources in Railway (slider, ~5 min, usage-billed ≈ **$10–20/mo per step**; Hobby plan $5/mo incl. credit, Pro $20/seat); (b) fix the known N+1s — `subscription.status` (per-contributor user lookups), `admin.listElders` (per-elder loops), both in `server/routers.ts` — dev-time only, **R0**; (c) second replica — server is stateless (Clerk JWT per request), safe to scale horizontally, ≈ **+$10–20/mo**.

### T3 — database
- **Watch:** Railway MySQL metrics: connections + slow queries.
- **Tripwire: connection errors in logs, or any query > 1s in slow log.**
- **Intervention:** (a) connection pool cap tune (code, R0); (b) add covering index `visits(elderId, userId, visitedAt)` if profiling shows it (migration, R0); (c) at ~5k+ families: managed MySQL with read replica (PlanetScale/AWS, from ≈ **$30–40/mo**).
- **Non-negotiable NOW:** confirm automated DB backups are ON in Railway. A spike we can ride out; data loss we cannot.

### T4 — auth ceiling
- **Watch:** Clerk dashboard → MAU. Free tier headline is now up to **50k MAU** (verify our plan's number in-dashboard — older plans were 10k).
- **Tripwire: 80% of our plan's MAU.**
- **Intervention:** Clerk Pro from ≈ **$25/mo**. Dashboard upgrade, zero code.

### T5 — knowing before users tell us
- **NOW (R0):** hourly automated health check on granwatch.app + `/api/health/notifications` with push alert on failure (coach can run this as a scheduled task), or UptimeRobot free (1-min checks, Konstand creates account).
- **Tripwire: any DOWN alert** → check Railway deploy logs first (bad deploy), then DB, then upstream (Clerk/LS status pages).

### T6 — the deliberate-spike rule
- **Before ANY planned viral moment** (big OFW push, Product Hunt, press, Apple feature submission): run the full pass — T1–T4 headroom check + fix both N+1s + bump Railway one step pre-emptively for the week. Budget: **~$40/mo temporary + one dev evening.**

## Standing threshold
**At 200 active families**, this document gets rewritten from real p95 data instead of estimates. Until then: weekly Railway glance, monthly Resend/Clerk quota glance, and no speculative infrastructure (no Redis, no queues, no microservices — the money goes to marketing).

## Cost summary if everything fires at once
Resend Pro $20 + Railway bump ~$20 + Clerk Pro $25 + managed DB ~$35 ≈ **~$100/mo (~R1,800)** at a scale (thousands of families) where even 5% paid conversion covers it many times over. Scale is a champagne problem; this page is the cork.
