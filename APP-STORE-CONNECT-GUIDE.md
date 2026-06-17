# App Store Connect Setup Guide
**For the developer building and submitting the GranWatch iOS native app**

Last updated: 2026-06-17  
Bundle ID: `app.granwatch`  
Apple Developer Team: Better Creation Pty Ltd  
Capacitor version: ^8.x

---

## Prerequisites checklist (before touching Xcode)

- [ ] Apple Developer Account active (paid, approved — ✅ done)
- [ ] Xcode 15+ installed and updated
- [ ] `npm run cap:build` runs without errors
- [ ] App boots on a simulator via `npx cap open ios`

---

## 1. Register the App ID (Bundle ID)

1. Go to [developer.apple.com/account](https://developer.apple.com/account) → Certificates, IDs & Profiles → **Identifiers**
2. Click **+** → App IDs → App → Continue
3. Fill in:
   - **Description:** GranWatch
   - **Bundle ID:** Explicit → `app.granwatch`
4. Under Capabilities, enable:
   - **Push Notifications** ✅ (required for Task #6 — native push)
   - **Sign in with Apple** ✅ (required per Apple guideline 4.8)
   - **Associated Domains** (optional — for universal links)
5. Click Continue → Register

---

## 2. Create a Push Notification Key (APNs Auth Key)

> One key works for both dev and production, and across all apps in your team.

1. Certificates, IDs & Profiles → **Keys** → **+**
2. Name: `GranWatch Push Key`
3. Enable: **Apple Push Notifications service (APNs)** → Continue → Register
4. **Download the .p8 file immediately** — you cannot download it again
5. Note the **Key ID** (10-character string)

Upload to Firebase:
1. Firebase Console → Project Settings → Cloud Messaging
2. Under "Apple app configuration" → Upload APNs Auth Key
3. Fill in: Key ID, Team ID (from your developer account), upload the .p8

---

## 3. Create the App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → **+** → New App
2. Fill in:
   - **Platform:** iOS
   - **Name:** GranWatch — Visit Tracker
   - **Primary Language:** English (South Africa) or English (U.K.)
   - **Bundle ID:** `app.granwatch` (select from dropdown — only appears after step 1)
   - **SKU:** `granwatch-ios-001` (internal only)
   - **User Access:** Full Access
3. Click Create

---

## 4. Configure Xcode signing

```bash
# From the project root:
npm run cap:build       # builds React app and syncs to ios/ folder
npx cap open ios        # opens Xcode
```

In Xcode:
1. Select the `App` target → **Signing & Capabilities**
2. Team: **Better Creation Pty Ltd**
3. Bundle Identifier: `app.granwatch` (should already be set by Capacitor)
4. Signing Certificate: **Automatically manage signing** ✅
5. Verify no errors appear under signing — Xcode will create provisioning profiles automatically

Add capabilities (if not auto-added by Capacitor):
- Click **+ Capability** → Push Notifications
- Click **+ Capability** → Sign in with Apple
- Click **+ Capability** → Background Modes → check "Remote notifications"

---

## 5. Capacitor configuration

Verify `capacitor.config.ts` (or `.json`) has:

```typescript
{
  appId: 'app.granwatch',
  appName: 'GranWatch',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}
```

Install the push notifications plugin (if not already):
```bash
npm install @capacitor/push-notifications
npx cap sync
```

In the client app (see Task #6 — push notification client integration):
- Call `PushNotifications.requestPermissions()` on first launch
- On registration, call `trpc.pushToken.register({ token, platform: 'ios' })`
- On logout, call `trpc.pushToken.unregister({ token })`

---

## 6. Add Firebase to the iOS project

1. Firebase Console → Project Settings → Add app → iOS
2. iOS bundle ID: `app.granwatch`
3. Download `GoogleService-Info.plist`
4. Drag it into Xcode under the `App` group (make sure "Copy items if needed" is checked, and it's added to the `App` target)
5. **Do not commit this file to git** — add it to `.gitignore`

```bash
echo "ios/App/App/GoogleService-Info.plist" >> .gitignore
```

---

## 7. App Store metadata (already prepared)

Content is in `APP-STORE-METADATA.md`. Paste it into App Store Connect:
- App Information → Name, Subtitle, Privacy Policy URL
- App Store tab → Description, Keywords, What's New
- Set age rating to **4+**

Screenshots required (from `APP-STORE-METADATA.md`):
- 6.7" (iPhone 16 Pro Max): 2796 × 1290px — 5 screenshots minimum
- 5.5" (iPhone 8 Plus): 1242 × 2208px — Apple still requires this size

---

## 8. TestFlight build

```bash
# On macOS with Xcode installed:
npm run cap:build
npx cap open ios
```

In Xcode:
1. Product menu → Archive (device must be set to "Any iOS Device", not a simulator)
2. Organizer window opens → Distribute App
3. Select **App Store Connect** → Upload
4. Leave all defaults checked (bitcode, symbols) → Next → Upload

In App Store Connect → TestFlight:
- The build appears within ~10 minutes (processing can take 30 min)
- Add yourself as an internal tester
- Install via TestFlight app on a real device
- Test the full flow: sign up, add gran, log visit, check push notifications

---

## 9. App Review Notes (paste into App Store Connect)

> Copy this into the "Notes" field under App Review Information:

```
GranWatch is a family visit tracking app. It does not offer in-app purchases
or subscriptions inside the native app. Gran+ subscriptions are available
exclusively at granwatch.app (Reader App model, per Apple guideline 3.1.3a).

Demo account:
Email: demo@granwatch.app
Password: GranWatchDemo2024

Account deletion: Settings → Account → Delete Account (available without support contact).

Sign in with Apple: implemented on the login screen alongside Google sign-in.

Push notifications: used for visit reminders only — no marketing messages.
```

---

## 10. Submit for review

1. App Store Connect → My Apps → GranWatch → App Store tab
2. Select the TestFlight build → Add for Review
3. Answer age rating questions (all "No" → 4+ rating)
4. Confirm pricing: **Free**
5. Set availability: all territories, or South Africa first if you want a soft launch
6. Click **Submit for Review**

Typical review time: 24–48 hours for a new app.

---

## Environment variable to add to Railway before launch

| Variable | Value | Notes |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | (JSON string) | From Firebase Console → Service Accounts → Generate key |

Paste the JSON as a single line (Railway handles multi-line strings fine too).

---

## Common issues

**"No profiles for app.granwatch found"** — Go back to step 1 and make sure the Bundle ID is registered in the Apple Developer portal first.

**"Missing Push Notification Entitlement"** — The Push Notifications capability wasn't added in Xcode. See step 4.

**"GoogleService-Info.plist not found"** — The Firebase plist must be added to the Xcode project (not just copied to the folder). Drag and drop it inside Xcode.

**Capacitor sync fails after `npm run build`** — Make sure `webDir` in `capacitor.config.ts` points to `dist`, which is where Vite outputs the build.
