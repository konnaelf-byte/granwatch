# GranWatch — STATUS
*Single source of truth for this project. Any session working here must OVERWRITE this file before ending (keep ≤1 page, newest truth only — history lives in git + SHARED_CONTEXT).*
*Last updated: 2026-07-27 by Weekly Ops Cron — health ✓, commit review, rejection signal flagged*

## Current state
- **iOS: submitted ~Jul 16; commit `eaaac6a` (Jul 23) fixes Apple Guideline 4 & 3.1.2(c) → likely REJECTED once. UNCONFIRMED whether fixed build was resubmitted — verify in App Store Connect first.**
- Notifications v2 engine shipped Jul 26 (`fa1be83`): unified push+email+in-app once per crossing, nudge ⅔ threshold, birthday push, visit reminders, opt-in social push. Nightly push spam fixed (`dc0e1fb`).
- Web + /privacy + /terms all healthy (checked 2026-07-27).
- **Android: FULLY PREPPED for production.** Build 2 (1.0, AD_ID-free) live on internal testing track. Store listing complete (name, descriptions, icon, 1024×500 feature graphic, 5 phone screenshots). **ALL 11 app-content declarations GREEN** incl. Data safety (collected-not-shared, matches iOS filing), content rating (Everyone), target audience (18+), privacy policy, ads=no, photo-permission justification. Play App Signing active.
- Proven on iOS device: Gran+ IAP ✓, self-updating widget ✓, email ✓. (Android v1 ships WITHOUT Gran+ — decision locked; widget/push iOS-only.)
- Traction: 19 organic family users (June), **0 paying customers, 0 marketing shipped**.

## Next actions (priority order)
0. **Verify in App Store Connect that the Jul 23 review fixes were resubmitted** — if the fixed build is sitting unsubmitted, the Apple clock isn't running.
1. **Android real-device smoke test** (only blocker before production): install via internal-test link `play.google.com/apps/internaltest/4700893685586288676` on a real Android phone (or emulator w/ d274bg Google acct). Verify email sign-in + Google sign-in. If Google sign-in throws DEVELOPER_ERROR → add the **Play App Signing SHA-1** (Console → App integrity) as a new Android OAuth client in Google Cloud project `granwatch` (debug SHA-1 client already created). Then **promote internal → Production** (org account is exempt from the 20-tester/14-day rule).
2. On Apple approval → release, then **Diaspora Outreach Playbook wave 1** (target 25 paying families by Aug 31). Critical path.
3. GEO playbook: Product Hunt, Reddit, schema markup.
4. SEC-01: rotate LemonSqueezy webhook secret (15 min, live secret in git history) + remaining audit items.
5. T&Cs lawyer review before public marketing push.

## Blockers / waiting on
- Apple review outcome (submitted ~Jul 16).
- Konstand: back up `~/granwatch-upload.keystore` (losing it blocks all future Android updates). Password in his manager.
- Firebase config files from Konstand (push → later build).

## Key context
- Android build/sign: `android/keystore.properties` (git-ignored) holds signing creds; `pnpm run cap:build` + `./gradlew bundleRelease` (JAVA_HOME = Android Studio JBR) → `android/app/build/outputs/bundle/release/app-release.aab`. AD_ID stripped via `tools:node="remove"` in AndroidManifest.
- Clerk prod fix (Jul 5): "Sign-up with password" toggled OFF — it was silently breaking ALL new native email sign-ups (iOS too).
- Moat: reset-ring mechanic unreplicated. Threat: **Nila** ($2.4M pre-seed, diaspora eldercare, PH expansion) — speed matters.
- Strategic role: WEALTH VEHICLE. R6M by Mar 2027 = traction → valuation → investment.
- Jul 24: Konstand meets a multi-startup scaler — can now say "live on Play internal + iOS in Apple review."
- Deep history: `SHARED_CONTEXT.md` in hub folder + repo docs (playbooks, security audit).
