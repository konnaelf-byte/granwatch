# GranWatch — STATUS
*Single source of truth for this project. Any session working here must OVERWRITE this file before ending (keep ≤1 page, newest truth only — history lives in git + SHARED_CONTEXT).*
*Last updated: 2026-07-28 — Apple rejection #2 answered; invite-link bug fixed; Manus purge complete.*

## Current state — iOS is ONE guideline away
- **Rejection #2 (Jul 28, build 1.0 (12), Submission ID `648ab24d-cf2a-4dfe-a5a1-4144728fb352`, reviewed on iPad Air 11-inch M3) cites Guideline 5.1.1(v) ONLY.** Guideline 4 and 3.1.2(c) from rejection #1 are GONE — commit `eaaac6a` (Jul 23) cleared them. The target is narrowing, not widening.
- **Rebuttal POSTED in App Store Connect on Jul 28** (no code change, no review reset). Argument: Gran+ *is* account-based — the entitlement is stored server-side against `elderId` and shared with every family member who joins that elder by invite code. "Unlimited family members" and "care notes visible to all visitors" are impossible without an account. Expect a reply in 1–3 days.
- Notifications v2 engine shipped Jul 26 (`fa1be83`). Web + /privacy + /terms healthy.
- **Android: FULLY PREPPED for production.** Build 2 (1.0, AD_ID-free) live on internal testing track; store listing complete; ALL 11 app-content declarations GREEN; Play App Signing active.
- Proven on iOS device: Gran+ IAP ✓, self-updating widget ✓, email ✓. (Android v1 ships WITHOUT Gran+ — locked; widget/push iOS-only.)
- Traction: 19 organic family users (June), **0 paying customers, 0 marketing shipped**.

## Shipped Jul 28 — commit `2a9a8aa` (13 files, +753/−135, pushed to main, Railway auto-deploying)
- **Invite-link bug fixed.** Real-device repro: wife created an elder, sent the invite by WhatsApp, Konstand tapped it → Brave opened → he signed in → landed on the dashboard with the invite silently lost. Root cause: `SSOCallbackPage` in `App.tsx` hard-coded `signInFallbackRedirectUrl="/dashboard"`, discarding the `redirect_url` that `JoinFamily.tsx` had correctly attached. Fixed in three layers — Clerk `forceRedirectUrl` (open-redirect guarded), a `gw_return_path` sessionStorage stash consumed once, and a Dashboard safety net (15-min TTL, `/join/` paths only). `NativeSignIn` given the same `returnPath` parity.
- **Total Manus independence achieved.** All four live dependencies removed: the CloudFront OG image is now self-hosted at `client/public/og-gran.png` (512×512 — the old 1MB original was likely being rejected by WhatsApp's crawler, which explains the stale cartoon-gran preview), `ManusDialog.tsx` deleted, `server/seed.ts` and `InstallPrompt.tsx` cleaned. Zero Manus URLs remain in the codebase.
- `@capacitor/app` installed and a guarded `appUrlOpen` deep-link router added in `main.tsx` — **inert until `cap sync` runs for build 13** (deliberate: activating the AASA entry before the native handler ships would open the app and lose the code, worse than today's browser flow).

## Next actions (priority order)
1. **Await Apple's reply to the 5.1.1(v) rebuttal (1–3 days).** If they hold firm, book an **App Review call** (Tue/Thu appointment slots) — do NOT trade another written round. Review Board appeal is the step after that. Code change is the last resort.
2. **Verify the deployed fix** — open a live invite link in a private/incognito browser window once Railway finishes. Note: WhatsApp caches link previews per-URL for days, so the old image may persist on already-sent invites.
3. **Android real-device smoke test** (only blocker before production): internal-test link `play.google.com/apps/internaltest/4700893685586288676`. Verify email + Google sign-in. If Google sign-in throws DEVELOPER_ERROR → add the **Play App Signing SHA-1** (Console → App integrity) as a new Android OAuth client in Google Cloud project `granwatch`. Then **promote internal → Production**.
4. **Build 13 (after Apple approval only, per the standing rule "always improve the app, but never at the cost of slowing the store listing"):** run `cap sync` to activate the native deep-link handler, then add `/api/og/invite/*` to the AASA so invites open the installed app directly.
5. Add a demo account with a populated family + a joined second member to the App Review Notes — pre-empts the next reviewer misreading the shared-entitlement model.
6. On Apple approval → release, then **Diaspora Outreach Playbook wave 1** (25 paying families by Aug 31). Critical path.
7. SEC-01: rotate LemonSqueezy webhook secret (15 min, live secret in git history). T&Cs lawyer review before the public marketing push. GEO playbook (Product Hunt, Reddit, schema markup).

## Blockers / waiting on
- **Apple's response to the Jul 28 rebuttal** — the single gate on the whole launch.
- Konstand: back up `~/granwatch-upload.keystore` (losing it blocks all future Android updates). Password in his manager.
- Firebase config files from Konstand (push → later build).
- DB check pending: Margaret's and Sophie's elder profiles may still hold Manus CloudFront `photoUrl` values from the old seed.

## Key context
- **Standing rule (Jul 28): always improve the app — but never at the cost of slowing down the store listing.** Anything that resets the review clock waits for approval.
- **Standing rule: complete independence from Manus.** No Manus-hosted assets, CDN URLs, or leftover components anywhere. Verified clean Jul 28.
- Android build/sign: `android/keystore.properties` (git-ignored) holds signing creds; `pnpm run cap:build` + `./gradlew bundleRelease` (JAVA_HOME = Android Studio JBR) → `android/app/build/outputs/bundle/release/app-release.aab`. AD_ID stripped via `tools:node="remove"`.
- Clerk prod fix (Jul 5): "Sign-up with password" toggled OFF — it was silently breaking ALL new native email sign-ups (iOS too).
- Naming: "GranWatch" under review. Konstand's criterion — **the name must let you infer the app's function** ("Loved One Watch" would be ideal but is too long). "LoveWatch" is dead: LoveWatch T.L.C. is a Virginia home-health-care agency = direct-category collision.
- Moat: reset-ring mechanic unreplicated. Threat: **Nila** ($2.4M pre-seed, diaspora eldercare, PH expansion) — speed matters.
- Strategic role: WEALTH VEHICLE. R6M by Mar 2027 = traction → valuation → investment.
- Deep history: `SHARED_CONTEXT.md` in hub folder + repo docs (playbooks, security audit).
