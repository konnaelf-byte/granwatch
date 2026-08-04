# BUILD 1.0.1 (13) — Wednesday checklist
*Everything below the line is YOUR part (needs Xcode + your Apple ID). All code prep is DONE and committed: cap sync ran (AppPlugin registered → invite links navigate in-app), RevenueCat SPM patches applied, version bumped to 1.0.1 / build 13 in the project file.*

## A. iOS (~25 min of clicking, mostly waiting)
1. Open the project: `npm run cap:ios` (or open `ios/App/App.xcodeproj`) — do NOT re-run cap:build, it's done.
2. Xcode → select "Any iOS Device (arm64)" → Product → Archive.
3. Organizer → Distribute App → App Store Connect → Upload. Wait for processing email (~10–30 min).
4. appstoreconnect.apple.com → GranWatch → next to "iOS App", click ⊕ → create version **1.0.1**.
5. "What's New in This Version" — paste:
   Family invite links now open straight in the app. Any family member can
   now subscribe for a gran. Family admins can hand over or step down.
   Small fixes and polish.
6. Build section → select **1.0 (13)**. Review notes + demo sign-in carry over — glance that d274bg@gmail.com is still there.
7. **Release option: AUTOMATIC this time** (no manual-release repeat).
8. Submit for Review. Update reviews are usually fast; demo family is intact.

## B. Android (~20 min, needs the Android test phone)
1. Install from the internal-test link: play.google.com/apps/internaltest/4700893685586288676
2. Smoke test: email sign-in, Google sign-in, dashboard loads, open an elder.
   - If Google sign-in throws DEVELOPER_ERROR → Play Console → Setup → App integrity → copy the **App signing SHA-1** → Google Cloud console (project `granwatch`) → Credentials → create Android OAuth client with that SHA-1 + package name → retest.
3. Play Console → Releases → promote **internal → Production**. Google review is typically hours.

## C. After both are submitted (5 min)
- Tell the coach session — STATUS.md gets updated and the launch-kit send gets scheduled against approval.
- Verify on your phone once 1.0.1 is live: tap a WhatsApp invite link → app opens **and lands on the join screen**.
