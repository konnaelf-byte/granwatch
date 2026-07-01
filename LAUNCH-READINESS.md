# GranWatch — App Store Launch Readiness

> Living checklist. Author: Opus (lead dev), 2026-06-22. 🔴 = hard blocker for submission · 🟡 = strongly recommended · 🟢 = done.

## How we test Gran+ in-app purchase (Apple IAP)

You **cannot** test IAP until these are in place:

1. **Paid Applications Agreement active** — App Store Connect → Business (Agreements, Tax & Banking). Sign the Paid Apps agreement and complete banking + tax forms. **IAP returns nothing until this is active** — most common blocker.
2. **IAP product created** — App Store Connect → your app → Subscriptions: create `gran_plus_monthly` (auto-renewable, the price tier ≈ $2.99/mo), with a subscription group, localized name/description, and a review screenshot. Status must be at least "Ready to Submit."
3. **RevenueCat configured** — RevenueCat project → add the App Store app (needs an App Store Connect API key / in-app-purchase shared secret) → create the product `gran_plus_monthly` → an **entitlement** (e.g. `gran_plus`) → an **offering**. Put `VITE_REVENUECAT_IOS_KEY` in the app build and `REVENUECAT_SECRET_API_KEY` + webhook in Railway.
4. **Sandbox tester** — App Store Connect → Users and Access → Sandbox → create a test Apple ID. On the iPhone, sign in to it under Settings → Developer/App Store → Sandbox Account.

**Then how testing actually works:** TestFlight builds automatically use Apple's **StoreKit sandbox** — testers are **never charged**. So in the TestFlight app you tap "Upgrade to Gran+", the native Apple purchase sheet appears, you confirm with the sandbox account, and RevenueCat grants the entitlement → Gran+ unlocks. Sandbox subscriptions renew on an accelerated clock (1 month ≈ 5 min, auto-cancels after ~6 renewals), so you can verify renewal + expiry quickly. Must also test **Restore Purchases**.

---

## Everything that must be 100% before we submit

### A. Authentication
- 🟢 Email sign-up / sign-in (native) — working
- 🟢 Google sign-up / sign-in (native) — working
- 🟢 Sign out — working
- 🔴 **Apple sign-in** — still failing ("unauthorized"). Must fix. *Apple requires "Sign in with Apple" whenever you offer another third-party login (Google), so this is non-negotiable unless we drop Google.*
- 🔴 **In-app account deletion** — Apple requires it for any app with account creation. Currently broken; must work end-to-end (and should also cancel the subscription + delete stored photos).

### B. Gran+ / Payments
- 🔴 Paid Apps Agreement + banking/tax active
- 🔴 `gran_plus_monthly` IAP created in App Store Connect
- 🔴 RevenueCat fully configured (product, entitlement, offering, keys in app + Railway + webhook)
- 🔴 Purchase + **Restore Purchases** tested in sandbox; entitlement unlocks Gran+; cancellation/expiry handled
- 🔴 Native app uses **IAP only** — never a web/Lemon Squeezy checkout (verify the Gran+ modal on native)
- 🟡 Gifting (flowers/gifts) — confirm these are **physical** goods/services (exempt from Apple IAP) so taking a commission via card/web is compliant; make sure it can't read as dodging IAP for digital goods.

### C. Core feature bugs
- 🔴 **Gran+ "Add Medication" DB error** — paid feature currently throws on save. Must fix (needs the real DB error from Railway).
- 🟡 **Home-screen widget** shows gran's status (currently blank). Fix or remove before submit — a dead widget is a poor first impression.
- 🟡 Core loop verified on device: create gran → log visit → status updates → invite/join family → nightly nudge.
- 🟢 Install-prompt no longer shows in native (fixed, pending deploy).

### D. App Store metadata & compliance
- 🔴 Listing: name, subtitle, description, keywords, **screenshots** (required device sizes), category, **age rating**
- 🔴 **App Privacy** questionnaire / nutrition label in ASC (declare Clerk, RevenueCat, analytics, photos, etc.)
- 🔴 **Demo account + instructions for App Review** (reviewers must be able to log in past the gated sign-in)
- 🔴 **Info.plist cleanup** — remove unused permission strings (prior audit flagged `NSPhotoLibraryAddUsageDescription`, `NSUserNotificationUsageDescription`); ensure remaining ones match real usage. Apple rejects mismatched/unused permissions.
- 🟢 Privacy Policy + Terms URLs exist (granwatch.app/privacy, /terms)
- 🟢 Sign in with Apple capability + entitlement added

### E. Backend hardening / cleanup (from prior audits)
- 🔴 **`subscription.setPaid` free-unlock exploit** — remove or lock to true admin before launch (anyone could unlock Gran+ free)
- 🟡 `MONTHLY_COST` bug (routers.ts:757 references undefined var) — fix
- 🟡 DB foreign keys + remaining indexes; cron crash-safety; account-deletion completeness (cancel sub, delete R2 photos)
- 🟡 Delete dead Manus/OpenAI scaffold (and finish the Manus→Clerk migration that's behind the sign-out/deletion/widget bugs)

### F. Final QA
- 🔴 Full pass on a physical device: all 3 logins (fresh + returning), sign-out, account deletion, Gran+ purchase + restore, core loop, widget.

---

## Suggested order
1. Finish auth: fix Apple + account deletion (both required).
2. Fix the medication DB error (paid feature).
3. Stand up payments: Paid Apps Agreement → IAP product → RevenueCat → sandbox test.
4. Security/cleanup: kill `setPaid`, Info.plist cleanup, dead-code removal.
5. Metadata + privacy + review demo account.
6. Final device QA → submit.
