# GranWatch — Android Native App Roadmap
*Drafted 2026-06-28. Goal: ship GranWatch on Google Play, reusing as much of the iOS work as possible.*

## The good news: most of it is already done
GranWatch is a **Capacitor** app whose UI loads **live from granwatch.app**. So the entire app (screens, auth logic, mood/care features, freemium model, RevenueCat *integration code*) is **already shared** with Android — there's an `android/` project in the repo and staged config from earlier. Android is a **thin native wrapper**, not a rewrite. The real work is three things native to Android: **auth, billing, and Play Store paperwork.** Expect this to be meaningfully *less* effort than iOS was.

---

## Phase 0 — Accounts (½ day, mostly waiting)
- **Google Play Console** developer account — one-time **$25** signup (vs Apple's $99/yr). Identity verification can take a day or two.
- A **Google Cloud project** already exists (used for iOS Google Sign-In) — reuse it.

## Phase 1 — Auth on Android (½–1 day)
- **Google Sign-In (native):** create an **Android OAuth client** in Google Cloud, which requires the app's **SHA-1** (and SHA-256) signing-certificate fingerprint.
  - Generate SHA-1 from the Android signing keystore via `keytool` (needs Java/JDK installed — this was the one blocker flagged earlier).
  - Add a **Clerk "Native Application" for Android** and register the Android OAuth client, mirroring the iOS setup.
- **Apple Sign-In on Android:** the web-OAuth approach we used for iOS works on Android too, but it's conventional to **hide "Continue with Apple" on Android** and lead with Google + email. Decide: hide Apple, or keep it via web OAuth. (Recommend: hide on Android.)
- **Email + code:** already works (shared web flow) — no Android-specific work.
- Code: a small platform check to hide Apple on Android (similar to how native vs web is already branched).

## Phase 2 — Billing on Android (1 day + Google's review lag)
- **Play Console:** create the auto-renewable subscription **`gran_plus_monthly`** (same product ID), $2.99, in a subscription group.
- **RevenueCat:** add a **Google Play app** to the existing GranWatch project, upload **Play service-account credentials (JSON)** so RevenueCat can validate purchases.
- **Offering:** RevenueCat offerings are **cross-platform** — add an Android package to the *existing* `default` offering pointing at the Play `gran_plus_monthly`. The **`gran_plus` entitlement is reused as-is**, so the app's unlock logic needs zero changes.
- **Env:** set **`VITE_REVENUECAT_ANDROID_KEY`** (the `goog_…` public key) in Railway — the code already reads it (`iap.ts`).
- Google Play billing requires the app be uploaded to a testing track before purchases work (license testers).

## Phase 3 — Build, sign, internal test (½ day)
- `pnpm run cap:build` → open `android/` in Android Studio (or Gradle CLI) → build a signed **AAB** (Android App Bundle).
- Create/secure an **upload keystore** (back it up — losing it is painful) or use **Play App Signing**.
- Upload to **Internal Testing** track → install on a real Android device → verify auth, core flows, and a **license-tested Gran+ purchase**.
- Android specifics to sanity-check: hardware **back button**, status-bar/safe-area, push (FCM already wired), and that the live-loaded UI renders well on Android.

## Phase 4 — Play Store listing + compliance (½ day)
- **Store listing:** title, short + full description (reuse `APP-STORE-SUBMISSION.md` copy), **phone screenshots** (+ 7" / 10" tablet recommended), a **512×512 icon** and **1024×500 feature graphic**.
- **Data safety form** — Android's privacy declaration. Use the audited facts in **`APP-PRIVACY.md`** (name/email via Clerk, push token, user content, purchases; **no tracking/analytics**).
- **Content rating** questionnaire (→ Everyone).
- **Target audience** = adults (not children).
- **Privacy Policy URL** (already live) + account-deletion info (already implemented).
- Submit for review (Google review is typically faster than Apple).

---

## What's reused from iOS (so you don't redo it)
- The entire app UI + all features (live web) ✅
- RevenueCat project, **`gran_plus` entitlement**, `default` offering, webhook ✅
- The freemium model, Care gating, mood/trends ✅
- Listing copy, privacy answers, age-rating logic ✅ (`APP-STORE-SUBMISSION.md`, `APP-PRIVACY.md`)
- Railway backend + tRPC + DB ✅ (one shared backend serves both platforms)

## New, Android-only
- Play Console account ($25) · Android OAuth client + SHA-1 · Clerk Android native app · Play subscription product + service-account JSON · `VITE_REVENUECAT_ANDROID_KEY` · signed AAB + keystore · Data safety form · tablet screenshots.

## Rough effort
**~3 focused days of work + Google review/verification lag.** Most of it is dashboards and config (which need your logins/2FA, like iOS did), plus the one-time `keytool`/SHA-1 step. I can guide each piece the same way we did RevenueCat, and the code-side changes (hide Apple on Android, confirm the Android RC key path) are small and I can do those.

## Suggested sequencing
Do Android **after** iOS is live (or in TestFlight + submitted). One platform at a time keeps testing clean, and the iOS launch will surface any cross-platform bugs cheaply first.
