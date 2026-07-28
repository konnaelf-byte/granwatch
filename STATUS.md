# GranWatch — STATUS
*Single source of truth for this project. Any session working here must OVERWRITE this file before ending (keep ≤1 page, newest truth only — history lives in git + SHARED_CONTEXT).*
*Last updated: 2026-07-29 (overnight) — OG share-card defect fixed & verified live; Manus purge finished; launch kit written.*

## Current state — iOS is ONE guideline away
- **Rejection #2 (Jul 28, build 1.0 (12), Submission ID `648ab24d-cf2a-4dfe-a5a1-4144728fb352`, reviewed on iPad Air 11-inch M3) cites Guideline 5.1.1(v) ONLY.** Guideline 4 and 3.1.2(c) from rejection #1 are GONE — commit `eaaac6a` (Jul 23) cleared them. The target is narrowing, not widening.
- **Rebuttal POSTED in App Store Connect on Jul 28** (no code change, no review reset). Argument: Gran+ *is* account-based — the entitlement is stored server-side against `elderId` and shared with every family member who joins that elder by invite code. Expect a reply in 1–3 days.
- **Web is live and takes money right now** (Lemon Squeezy, R79/mo; iOS IAP $2.99/mo). **Android build 2 is one smoke test from Production.** Apple is a credibility upgrade, not a prerequisite for revenue — see the launch kit.
- Notifications v2 engine shipped Jul 26 (`fa1be83`). Web + /privacy + /terms healthy.
- Traction: 19 organic family users (June), **0 paying customers, 0 marketing shipped**.

## Shipped overnight Jul 28→29 — commit `3332cb9` (server + web bundle only; no native rebuild, no review reset)
- **OG share-card dimension mismatch fixed.** `ogRoute.ts` hard-coded `og:image:width=1200 / height=630` while the actual asset (`og-gran.png`) was 512×512, and elder photos are arbitrary user-uploaded sizes. Crawlers that trust the declaration letterbox, crop or drop the card — and `twitter:card=summary_large_image` behind a square image renders badly. **The invite link is the growth loop, so a broken preview leaked every invite.**
  - New `client/public/og-default.png` — a real 1200×630 branded card (cream, gran illustration, "Keep Gran in the green."), self-hosted, generated from the existing asset.
  - `buildOgHtml()` now takes optional `imageWidth`/`imageHeight` and emits the dimension meta tags **only when the size is actually known**. Elder-photo previews declare nothing and fall back to `twitter:card=summary`; the default card keeps `summary_large_image`.
  - **Verified live in production:** `og-default.png` 200 / 297,896 bytes; `/api/og/share` and `/api/og/invite/:code` both serve the correct URL, correct 1200×630 declaration and `summary_large_image`.
- **Manus purge finished.** The leftover `__manus__/debug-collector.js` (821-line telemetry collector — console, network bodies, UI events) was still sitting in `client/public/` **and in both native bundles** (`ios/App/App/public/`, `android/.../assets/public/`). All three moved to `~/Documents/Claude/_to_delete/` — **delete that folder yourself when you're happy.** They were gitignored, untracked and unreferenced by any `index.html`, so nothing was live in production and nothing executed inside the submitted binary. Build 13 will now be genuinely clean.
- `npx tsc --noEmit` passes.

## Next actions (priority order)
1. **Await Apple's reply to the 5.1.1(v) rebuttal (1–3 days).** If they hold firm, book an **App Review call** (Tue/Thu appointment slots) — do NOT trade another written round. Review Board appeal is the step after. Code change is last resort.
2. **Join the three OFW Facebook groups TODAY** and leave 3 genuine comments this week. The playbook's own join→observe→post rule means a launch-day join makes the 48-hour window impossible. This is the single highest-leverage 30 minutes available. (`Projects/…/GranWatch — Launch Kit (Diaspora Wave 1).md`, Part 1.)
3. **Android real-device smoke test** (only blocker before production): internal-test link `play.google.com/apps/internaltest/4700893685586288676`. Verify email + Google sign-in. If Google sign-in throws DEVELOPER_ERROR → add the **Play App Signing SHA-1** (Console → App integrity) as a new Android OAuth client in Google Cloud project `granwatch`. Then **promote internal → Production**.
4. **Build 13 (after Apple approval only, per the standing rule):** run `cap sync` to activate the native deep-link handler, then add `/api/og/invite/*` to the AASA so invites open the installed app directly.
5. Add a demo account with a populated family + a joined second member to the App Review Notes (**you must create the account — I can't**), pre-empting the next reviewer misreading the shared-entitlement model.
6. On approval → release, then run the launch kit. Target: 25 paying families by Aug 31.
7. SEC-01: rotate LemonSqueezy webhook secret (15 min, live secret in git history). T&Cs lawyer review before the public push. GEO playbook (Product Hunt, Reddit, schema markup). Back up `~/granwatch-upload.keystore`.

## Watch items
- **iOS price is ~30% below web:** $2.99 (≈R55, less Apple's 15–30% → ≈R40 net) vs R79 on web. Every push toward the App Store is a push toward the lower-margin channel. Deliberate or accidental? Needs a conscious call.
- Stale comment in `Landing.tsx` says R39; the real constant is R79 and renders correctly. Cosmetic only — left alone while the store listing is frozen.
- DB check outstanding: Manus CloudFront `photoUrl` values may still sit on Margaret's and Sophie's profiles.

## Key context
- **Standing rule (Jul 28): always improve the app — but never at the cost of slowing down the store listing.** Anything that resets the review clock waits for approval.
- **Standing rule: complete independence from Manus.** No Manus-hosted assets, CDN URLs, or leftover components anywhere. Verified clean Jul 29 (last three copies removed overnight).
- **Standing rule: never ask permission to update STATUS.md or SHARED_CONTEXT.md.** Maintaining them is the assistant's job.
- Naming: "GranWatch" under review. Konstand's criterion — **the name must let you infer the app's function** ("Loved One Watch" would be ideal but is too long). "LoveWatch" is dead: LoveWatch T.L.C. is a Virginia home-health-care agency = direct-category collision. **No naming decision until after Apple approval.**
