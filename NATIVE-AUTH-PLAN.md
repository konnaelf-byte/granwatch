# GranWatch — Bulletproof Native Auth Plan

> Goal: Apple, Google, and Email sign-in all working reliably in the native iOS app — no Safari bounce, no lost sessions. Author: Opus (lead dev), 2026-06-22.

## Why the current native flow breaks
The app is a Capacitor WebView pointing at `server.url = https://granwatch.app`. Clerk's **web** OAuth does a full-page navigation, which Capacitor throws to Safari; auth completes in Safari's separate session and the app never sees it. Google also blocks OAuth inside embedded WebViews entirely. Email works (XHR, no redirect).

## Architecture decision
Clerk has **no Capacitor-native SDK** (only Expo + Swift). So:
- **Email** → keep Clerk's in-WebView flow (works today).
- **Apple / Google (native)** → use a native sign-in plugin to get the provider **ID token**, then exchange it with Clerk JS:
  - `const res = await signIn.create({ strategy: 'oauth_token_apple', token })`
  - if `res.status === 'complete'` → `setActive({ session: res.createdSessionId })`
  - else (new user) handle transfer: `await signUp.create({ transfer: true })` → `setActive`.
  - Same pattern for Google with `strategy: 'oauth_token_google'`.

This keeps everything inside the app, respects the "no web redirect / no barrier to entry" rule, and sidesteps Google's embedded-WebView block.

## Plugin
`@capgo/capacitor-social-login` (maintained, native Apple + Google in one plugin). Configure:
- iOS Google: `iOSClientId` = new iOS OAuth client; `iOSServerClientId` = existing **web** client `156428600768-4bdsso544vgd5o6ri81r97kqp27a351u.apps.googleusercontent.com` (so the returned idToken's `aud` = web client ID, which Clerk's Google connection already trusts).
- Apple: uses the app bundle id `app.granwatch`.

## Provisioned values (done 2026-06-22)
- **iOS Google OAuth client ID:** `156428600768-kk8a2atra3haubsa91aoncmg6d7073rv.apps.googleusercontent.com` (project `granwatch`, bundle `app.granwatch`, Team `BFA6JYY9YD`)
- **iOS reversed-client-ID (Info.plist URL scheme):** `com.googleusercontent.apps.156428600768-kk8a2atra3haubsa91aoncmg6d7073rv`
- **Web (server) client ID for `iOSServerClientId`:** `156428600768-4bdsso544vgd5o6ri81r97kqp27a351u.apps.googleusercontent.com`
- **Apple Services ID:** `app.granwatch.signin` · **Key ID:** `6KK9R5KL2W` · **Team ID:** `BFA6JYY9YD` · App ID `app.granwatch` has Sign in with Apple enabled.

## Config to provision (Opus)
1. **GCP**: create an **iOS-type** OAuth client in project `granwatch`; note the iOS client ID + reversed-client-ID. (Browser, like the web client.)
2. **Info.plist**: add the reversed-client-ID as a URL scheme.
3. **Xcode**: add the **Sign in with Apple** capability to the App target's entitlements (`ios/App/App/App.entitlements`).
4. **Clerk**: confirm the Apple connection accepts native tokens whose `aud = app.granwatch` (primary App ID of the Services ID). Confirm Google connection trusts the web client ID (already set).
5. **Apple**: register the Email Source (`bounces+109567884@clkmail.granwatch.app`) under Services → Sign in with Apple for Email Communication (for Hide My Email; `clkmail` DNS already set).

## Code (Sonnet, reviewed by Opus)
- Add `@capgo/capacitor-social-login`; init in `main.tsx`.
- `client/src/components/NativeSignIn.tsx`: custom Apple + Google buttons that run the native flow + Clerk token exchange + `setActive`, plus the email field via `useSignIn` email-code.
- `client/src/App.tsx` `SignInPage`: `if (Capacitor.isNativePlatform())` render `<NativeSignIn/>`; else keep Clerk `<SignIn/>` (web unchanged).
- `capacitor.config.json`: add SocialLogin plugin config.

## Build (Konna + Opus)
`npm run cap:build` (build + cap sync + fix-revenuecat-spm) → Xcode: confirm Sign in with Apple capability → archive (GUI) → upload TestFlight = **Build 6**. Native plugin + entitlement changes REQUIRE this rebuild (JS-only changes still hot-deploy via Railway).

## Test matrix (must all pass before App Store submit)
Fresh Apple sign-up · returning Apple sign-in · fresh Google sign-up · returning Google sign-in · email sign-up+code · email sign-in · sign-out · session persists after app restart. Test on real device.

## STATUS 2026-06-22
Code implemented by Sonnet, reviewed by Opus, **committed `d335eee` (NOT pushed)**. Critical APIs verified against repo's Clerk types: `oauth_token_apple` exists (Apple ✓); `oauth_token_google` does NOT — Google uses `clerk.authenticateWithGoogleOneTap({token})` ✓; `transferable` new-user path ✓. Files: NativeSignIn.tsx (new), App.tsx (native branch), main.tsx (SocialLogin.initialize), capacitor.config.json, Info.plist (URL scheme), App.entitlements (Sign in with Apple), package.json.
**Blocker before push:** `pnpm-lock.yaml` was NOT updated (sandbox has no registry). Pushing with package.json/lockfile out of sync can break the Railway production web build. Must run `pnpm install` on Mac first.

## Build runbook (next session, on Konna's Mac — Opus drives Xcode, Konna runs cmds)
1. `cd` repo. `rm _tmp_6_*` (empty temp files). `git status` — review the pre-existing uncommitted `ios/.../project.pbxproj` + GranWatchWidget changes; decide keep or `git checkout --` discard (they're unrelated to auth).
2. `pnpm install` → regenerates lockfile incl. `@capgo/capacitor-social-login`.
3. `pnpm check` (tsc) — confirm no type errors. `pnpm build` — confirm web build succeeds.
4. **Push** commit `d335eee` to GitHub (web bundle stays in sync; safe now that lockfile is fixed + build verified). Watch Railway deploy succeed.
5. `pnpm run cap:build` (vite build + cap sync + fix-revenuecat-spm; cap sync runs pod install for the new plugin).
6. Xcode: open `ios/App/App.xcworkspace` → App target → Signing & Capabilities → confirm **Sign in with Apple** capability is present (add via "+ Capability" if Xcode didn't pick up the entitlement) → bump build number to **6** → Product → Archive → Distribute App → TestFlight.
7. On device (Build 6) run the full test matrix below.

## Known risks / iterate points
- Token `aud` mismatch → adjust Clerk client IDs / plugin serverClientId.
- New-user transfer flow (signUp.create({transfer:true})).
- Missing Sign in with Apple entitlement on the target → native Apple sign-in throws.
