# Manual Steps for Konna
## What I've done, and exactly what you need to do next

*Last updated: 2026-06-19*

---

## ✅ Already Done (autonomous sprints)

| # | Task | Status |
|---|------|--------|
| 1 | Full App Store & Google Play metadata | ✅ Done |
| 2 | RevenueCat native IAP integrated (client SDK) | ✅ Done |
| 3 | Deep linking (Universal Links + App Links) | ✅ Done |
| 4 | iOS universal links server routes | ✅ Done |
| 5 | Android permissions + intent filters | ✅ Done |
| 6 | Push notifications backend (FCM) | ✅ Done |
| 7 | Gift / flowers buttons with activity log | ✅ Done |
| 8 | Gran+ care schedule (meds + appointments) | ✅ Done |
| 9 | Australia market strategy (AUD $4.99) | ✅ Done |
| 10 | Age rating answers (Apple 4+, Google Everyone) | ✅ Done |
| 11 | Screenshot shot list (8 screens for both stores) | ✅ Done |
| 12 | Xcode build guide (step-by-step, with tips) | ✅ Done |
| 13 | Accessibility pass (VoiceOver labels, zoom fix, skip link) | ✅ Done |
| 14 | Offline service worker — visits cached, loads without internet | ✅ Done |
| 15 | **Clerk switched to Production keys** (pk_live / sk_live) | ✅ Done |
| 16 | **apple-app-site-association fixed** with real Team ID BFA6JYY9YD | ✅ Done |
| 17 | **All 20 Railway env vars restored** + REVENUECAT_WEBHOOK_AUTH_HEADER added | ✅ Done |

---

## 🔴 What Only You Can Do

### Step 1 — Open the Xcode project

There's a macOS notification permission dialog (UserNotificationCenter) that has been blocking automated Xcode opening. Just do this manually:

1. Open **Finder**
2. Navigate to: `Documents → Claude → GranWatch data from Manus → ios → App`
3. Double-click **App.xcodeproj**

Or use Terminal:
```
open "/Users/konnaseelf/Documents/Claude/GranWatch data from Manus/ios/App/App.xcodeproj"
```

---

### Step 2 — Set up Signing in Xcode

Once the project is open:

1. Click **App** in the left sidebar (the blue icon at the top of the file tree)
2. Click the **Signing & Capabilities** tab
3. Under **Signing**:
   - Check **Automatically manage signing**
   - Set **Team** → `Better Creation (Pty Ltd)`
   - Verify **Bundle Identifier** = `app.granwatch`
4. Add capabilities (click **+ Capability** button):
   - ✅ Push Notifications
   - ✅ Associated Domains → add `applinks:granwatch.app` and `webcredentials:granwatch.app`

---

### ~~Step 3 — Replace the Team ID placeholder~~ ✅ DONE

The apple-app-site-association has been updated with the real Team ID `BFA6JYY9YD`
and pushed to `main` (commit `5c9e0c7`). Railway has already deployed it.

---

### Step 4 — Set up RevenueCat (full guide in REVENUECAT-SETUP-GUIDE.md)

Quick summary:
1. Go to **app.revenuecat.com** → New project → `granwatch`
2. Create product `gran_plus_monthly` at **$2.99/month** in RevenueCat
3. Create entitlement `gran_plus`
4. Create offering `default` with package `$rc_monthly` pointing to `gran_plus_monthly`
5. Add **3 more Railway env vars** (Project → granwatch service → Variables):
   ```
   REVENUECAT_SECRET_API_KEY=sk_...    ← from RevenueCat → API Keys
   VITE_REVENUECAT_IOS_KEY=appl_...    ← from RevenueCat → iOS app public key
   VITE_REVENUECAT_ANDROID_KEY=goog_...  ← from RevenueCat → Android app public key
   ```
   > ✅ `REVENUECAT_WEBHOOK_AUTH_HEADER` is **already set in Railway** to:
   > `6641e00ed6d16c425b498093b2846d5ef0f627845bb374f47fa717760b86eba7`
   >
   > When creating the webhook in RevenueCat → Integrations → Webhooks, use:
   > - **URL:** `https://granwatch.app/api/revenuecat/webhook`
   > - **Authorization header:** `6641e00ed6d16c425b498093b2846d5ef0f627845bb374f47fa717760b86eba7`

---

### Step 5 — Create product in App Store Connect

1. Go to **appstoreconnect.apple.com**
2. Your App → **In-App Purchases** → Create new
3. Type: **Auto-Renewable Subscription**
4. Reference name: `Gran Plus Monthly`
5. Product ID: `gran_plus_monthly`
6. Price: **$2.99** per month
7. Localisation (EN-AU too): "Gran+" / "Unlock wellbeing check-ins, care schedule & full visit history"

---

### Step 6 — Create the AUD pricing variant in Lemon Squeezy

For the Australian market (web checkout only, not IAP):
1. Go to **app.lemonsqueezy.com** → Products → Gran+
2. Variants → Add variant
3. Price: **AUD $4.99/month**
4. Copy the variant ID
5. Add to Railway: `LS_VARIANT_ID_AUD=<your variant id>`

---

### Step 7 — Archive and upload to TestFlight (guide in XCODE-BUILD-GUIDE.md)

Quick flow:
1. Xcode → select **Any iOS Device (arm64)** as destination
2. Product → **Archive**
3. Window → **Organizer** → Distribute App → App Store Connect → Upload
4. Go to App Store Connect → TestFlight → Add internal testers (your email)
5. Install TestFlight on your iPhone, accept the invite, test the app

---

### Step 8 — Google Play Console

1. Sign up at **play.google.com/console** ($25 one-time fee)
2. Create app → `GranWatch`
3. After the iOS app is signed, get your Android release keystore SHA256:
   ```bash
   keytool -list -v -keystore my-release-key.jks
   ```
4. Replace `PLACEHOLDER_SHA256_FINGERPRINT` in:
   ```
   client/public/.well-known/assetlinks.json
   ```
5. Commit and push

---

## 🟡 Optional but Recommended

### ~~Clerk Production Keys~~ ✅ DONE
All three Clerk production keys (`pk_live_` / `sk_live_`) are already set in Railway
and in the local `.env`. The app is running on the `granwatch.app` production instance.

### Publish the Lemon Squeezy ZAR variant
The default ZAR R79/month variant (ID: 1681701) needs to be **published** in the LS dashboard — it's currently draft.
1. LS Dashboard → Products → Gran+ → Default variant → Publish

---

## 📋 Quick Reference — Current Commit Log

```
3cad1d4  feat: offline service worker — cache-first static + network-first tRPC
ff6fbf1  a11y: VoiceOver labels, remove zoom-block, skip link, aria-hidden icons
3dce2d3  docs: App Store submission guides (RevenueCat, Xcode build, screenshots)
7499e75  feat: iOS universal links + Android app links
b854600  fix: Android deep link intents, push notification Info.plist, Umami warnings
```

All of these are live on Railway. The iOS/Android project at `ios/App/App.xcodeproj` is fully synced and ready to open in Xcode — the last build ran with **zero warnings**.
