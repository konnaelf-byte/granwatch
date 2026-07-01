# GranWatch — Morning Runbook (overnight work by Opus)

> Open this first. Everything below is staged or documented. Start at Step 1.

## TL;DR
Overnight I fixed/staged: account deletion (now removes the Clerk user), `MONTHLY_COST` bug, and an Apple sign-in nonce attempt. Verified `setPaid` exploit and Info.plist were already fixed. Diagnosed the medication error (a missing DB migration that should run on next deploy). **All of it hot-deploys via Railway — no Xcode rebuild needed** unless Apple still fails. First action: double-click `morning-deploy.command`, wait ~3 min, then run the Test Matrix on your existing Build 6.

---

## Step 1 — Deploy + test (no rebuild)
1. Double-click **`morning-deploy.command`** (commits + pushes the 2 staged files; Railway redeploys + runs DB migrations).
2. Wait ~3 min for Railway. Relaunch the **Build 6** TestFlight app.
3. **Test Matrix:**
   - ✅ Google sign-in (regression check) · ✅ Email sign-in · ✅ Sign out
   - 🔬 **Apple sign-in** — does the nonce fix clear "unauthorized"? (If not → Step 2.)
   - 🔬 **Account deletion** — delete from Account; you should be fully signed out AND unable to sign back into the same account (Clerk user is now deleted server-side).
   - 🔬 **Gran+ → Add Medication** — the redeploy re-runs migrations; if the table was the issue it should now save. (If it still errors → Step 3.)

---

## Step 2 — If Apple STILL says "unauthorized" (fallback: web OAuth)
Root cause (researched): native Apple tokens carry `aud = app.granwatch` (bundle ID), but Clerk's web token-exchange may only trust the Services ID. The nonce attempt may not be enough. The robust fallback is Clerk's **web Apple OAuth** (which uses the Services ID we configured). Apple — unlike Google — permits this in a WebView.

In `client/src/components/NativeSignIn.tsx`, replace the body of `handleApple()` with:
```ts
const signIn = getSignIn();
await signIn.authenticateWithRedirect({
  strategy: "oauth_apple",
  redirectUrl: "https://granwatch.app/sign-in/sso-callback",
  redirectUrlComplete: "https://granwatch.app/dashboard",
});
```
Then in `capacitor.config.json`, add under `server`:
```json
"allowNavigation": ["appleid.apple.com", "*.apple.com", "clerk.granwatch.app", "accounts.granwatch.app"]
```
The `/sign-in/sso-callback` route already exists in `App.tsx`. **This path changes `capacitor.config.json` (native), so it needs a Build 7** (run `build-ios.command`, then archive Build 7 in Xcode — I can drive the Xcode clicks when you're around). Test on device.

---

## Step 3 — If medication STILL errors after redeploy
The schema + migration (`drizzle/0010_care_schedules.sql`) are correct, and `runMigrations()` runs on every deploy. If it still fails, the client error hides the real cause — **pull the Railway runtime log** for the `elderMedications` insert (the real MySQL line: missing column, etc.). Ping me with that line and I'll fix it precisely.

---

## Step 4 — Payments / Gran+ IAP (now unblocked — Paid Apps agreement done ✅)
1. **App Store Connect** → your app → **Subscriptions**: create a subscription group + `gran_plus_monthly` (auto-renewable, ~$2.99/mo), with localized name/description + a review screenshot.
2. **RevenueCat**: project → add the App Store app (needs an App Store Connect **In-App Purchase API key**) → add product `gran_plus_monthly` → create entitlement `gran_plus` → create an offering. Copy keys: put `VITE_REVENUECAT_IOS_KEY` in `.env.production` + Railway; put `REVENUECAT_SECRET_API_KEY` + the webhook in Railway.
3. **Test (free, sandbox)**: TestFlight uses Apple's sandbox automatically. Tap "Upgrade to Gran+" → confirm with a **Sandbox tester** Apple ID → Gran+ unlocks. Also test **Restore Purchases**. Verify the native modal uses IAP only (never a web/Lemon Squeezy checkout).

I can do the RevenueCat + ASC config with you via the browser once you're up (much is clickable).

---

## Step 5 — Android readiness (prep; do when ready)
The social-login plugin is already synced for Android. To make native Google + email work on Android:
1. **Get the signing SHA-1** (keytool needs Java — install Temurin JDK, or use Android Studio → Gradle → `signingReport`). You need debug **and** release SHA-1.
2. **Google Cloud** (project `granwatch`): create an **Android** OAuth client — package `app.granwatch` + the SHA-1(s).
3. **`client/src/main.tsx`**: extend `SocialLogin.initialize` Google config for Android (`androidClientId` + keep `webClientId` = the existing web client `156428600768-4bdsso544vgd5o6ri81r97kqp27a351u...` as serverClientId so the idToken aud matches Clerk).
4. **Hide the Apple button on Android** in `NativeSignIn.tsx` (native Apple is iOS-only; gate with `Capacitor.getPlatform() === 'ios'`).
5. **Clerk** → Native Applications → add the **Android** app (package + SHA-256). 
6. Google Play Console signup ($25) — still on the to-do list (SHARED_CONTEXT).

---

## Step 6 — Before submission (compliance)
- **App Review demo account**: create a throwaway email account in-app, and in App Review notes give the reviewer the email + how to get the code (or a pre-set password account). They must get past the gated sign-in. Note: "Gifting (flowers/gifts) are physical goods/services, not digital — handled outside IAP per Apple guidelines."
- **App Privacy questionnaire** (ASC): declare data collected — email + name (Clerk, for account), photos (R2, profile pics), usage/diagnostics; purpose = app functionality; not used for tracking; not sold.
- DSA trader info ✅ done. Privacy Policy + Terms URLs ✅ exist.
- Full checklist + status: see `LAUNCH-READINESS.md`.

---

## What changed overnight (for your review before pushing)
- `server/routers.ts` — `deleteAccount` now deletes the Clerk user (best-effort, after DB cleanup); `MONTHLY_COST` → `MONTHLY_COST_CENTS` (was an undefined-var bug in subscription status).
- `client/src/components/NativeSignIn.tsx` — Apple flow now generates a nonce (hashed → Apple, raw → Clerk).
- Already pushed by you earlier: sign-out clears Clerk session; install prompt hidden in native.
- No security/Info.plist changes needed — `setPaid` was already locked to owner-admin; unused permission strings already removed.
