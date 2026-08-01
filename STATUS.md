# GranWatch — STATUS
*Single source of truth for this project. Any session working here must OVERWRITE this file before ending (keep ≤1 page, newest truth only — history lives in git + SHARED_CONTEXT).*
*Last updated: 2026-07-31 — **🎉 APPROVED by App Review (attempt #3). ⚠️ NOT YET LIVE: manual release selected — Konstand must press RELEASE in ASC.** Same day: 6-month free trial shipped live (`6bdfbcf`), admin Gift Gran+ button live, broken split-the-bill UI removed (`b5eceaf`). Launch mode.*

## Current state
- **iOS APPROVED Jul 31** (build 1.0 (12), submission `648ab24d…`), <1 day after the Jul 30 21:18 resubmission. **Release button NOT yet pressed** (manual release). After release: up to 24h to appear on the store.
- **Free trial LIVE on web + server** (verified in prod bundle `index-DCQvAvA3.js`): every new elder profile gets **180 days of full Gran+** (no opt-in button, no card); migration 0017 grandfathered **all existing free profiles** incl. the 19 June families. Entitlement = `isPaid OR trialEndsAt future` (`server/entitlement.ts`); server aliases effective entitlement onto `isPaid` so **frozen native build 12 unlocks trials with zero client changes**. Expiry LOCKS, never deletes — warm "your data is safe" message. Subtle countdown badge (amber <30d) on Care tab, mood trend, visit photo, settings, modal; subscribe-anytime kills it (billing starts immediately, no day-banking).
- **Admin gifting live**: granwatch.app/admin → per-elder **Gift Gran+ / Revoke** (owner-admin only). For retirement-village/frail-care comps + family. Track comps in the launch-kit table — DB can't tell comped from paid.
- **Split-the-bill removed** (web): it divided the *displayed* price only — checkout always charged full R79 ("Join split — R39.50" actually billed R79 as a second subscription). One volunteer family member pays. Native bundle still shows split UI until build 13 (harmless since `a7ab3b9` decoupled it from payment).
- Web takes money (LS R79/mo); iOS IAP $2.99/mo; Android build 2 one smoke test from Production. Traction: 19 organic users, 1 paying (Konstand's self-test), 0 marketing shipped.

## Next actions (priority order)
1. **Konstand: press RELEASE in ASC** (version 1.0 → Release This Version). Then verify on the old iPhone that the RevenueCat error is gone and $2.99 shows.
2. **Run the launch kit — the 48-hour clock started at approval.** Jaco second touch (was explicitly reserved for approval — trigger fired), WhatsApp to the 25 with the App Store link, OFW group posts per the join→observe→post rule. Target: 25 paying families by Aug 31 (trial changes the metric: count *activated families* now, paying conversions from month 6).
3. **Android**: real-device smoke test (`play.google.com/apps/internaltest/4700893685586288676`) → promote to Production. DEVELOPER_ERROR on Google sign-in → add Play App Signing SHA-1 as Android OAuth client in GC project `granwatch`.
4. **Build 13 (now unblocked, no rush — ship after launch week):** `cap sync` picks up split-removal + TrialBadge + trial modal state; add native deep-link handler activation + `/api/og/invite/*` to AASA. Also design the **review-account exception** before re-enabling Clerk Client Trust (every update review hits the same wall).
5. **iOS price decision**: recommendation = raise $2.99 → $4.49/$4.99 (≈R80–89) to align with web R79, NOT drop web to R49 (no price-resistance evidence, diaspora earns hard currency, trial does acquisition now). ASC config only, no review. Konstand to decide.
6. **Trial follow-ups**: T-14d warning email (cron); native modal trial copy at build 13; decide founding-family conversion offer before first trials expire (~late Jan 2027).
7. SEC-01 rotate LS webhook secret (live secret in git history); T&Cs lawyer review; back up `~/granwatch-upload.keystore`; GEO playbook; DB check for Manus CloudFront `photoUrl` on Margaret's profile (Sophie confirmed on placeholder).

## Standing rules / watch items
- Client Trust stays OFF until the review-account exception exists. R79 LS self-test sub: safe to cancel post-approval, but keeping it keeps the demo family paid for future *update* reviews.
- Demo account d274bg@gmail.com is in ASC notes, member of Sophie + Opa Joe families (both Gran+ active) — keep intact for update reviews.
- Naming criterion unchanged (name must let you infer function); revisit post-launch, not before.
- Complete Manus independence (verified Jul 29); `~/Documents/Claude/_to_delete/` awaits Konstand's deletion.
- Migration drift healed: drizzle snapshots were stuck at 0014 (0015/0016 hand-written) — 0017's snapshot now matches reality; future `drizzle-kit generate` is safe again. Never ship a generated migration unreviewed.
