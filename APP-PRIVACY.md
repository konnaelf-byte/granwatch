# GranWatch — App Store "App Privacy" Declaration (Code-Verified)

> **Read-only audit. No code was changed.** Every data type below is backed by file:line evidence from the actual codebase. Use this to fill the App Store Connect → App Privacy "nutrition label" and to fix the in-app Privacy/Terms pages.
>
> **Bottom line:** GranWatch collects data only for **App Functionality** and **Account Management**. There is **no tracking**, **no advertising**, **no analytics SDK**, and **no HealthKit**. The data label should be modest. The biggest risk is the in-app Privacy page, which currently **claims an analytics tool ("Umami") that does not exist in the code** — that inaccuracy must be removed before submission.

---

## (a) App Store Connect — App Privacy answer table

For each: **Collected?** → **Linked to identity?** → **Used for Tracking?** → **Purpose**.
"Linked" = yes for essentially everything, because all rows are keyed to a `userId` / Clerk identity. **Nothing is used for tracking** (no data is shared with third parties for cross-app/-site advertising or shared with data brokers).

| Apple data category | Specific data type | Collected? | Linked to identity? | Tracking? | Purpose | Evidence (file:line) |
|---|---|---|---|---|---|---|
| **Contact Info** | Name | Yes | Yes | No | App Functionality | `drizzle/schema.ts:9` (users.name); from Clerk |
| **Contact Info** | Email Address | Yes | Yes | No | App Functionality; Account Management | `drizzle/schema.ts:10` (users.email); from Clerk |
| **Identifiers** | User ID | Yes | Yes | No | App Functionality | `drizzle/schema.ts:7-8` (users.id, users.openId = Clerk ID) |
| **Identifiers** | Device ID (push token) | Yes | Yes | No | App Functionality (push reminders) | `drizzle/schema.ts:187-199`; written `server/pushRouter.ts:35-44` keyed to `ctx.user.id` |
| **Purchases** | Purchase History (Gran+ subscription status) | Yes | Yes | No | App Functionality | `drizzle/schema.ts:34-37` (isPaid, lemonsqueezySubscriptionId/CustomerId); RevenueCat configured with Clerk user ID as appUserID `client/src/utils/iap.ts:57` |
| **User Content** | Photos (elder profile photos, visit photos) | Yes | Yes | No | App Functionality | `drizzle/schema.ts:27` (elders.photoUrl), `:75` (visits.photoUrl); stored in R2 `server/storage.ts:70-74` |
| **User Content** | Other User Content — visit notes, care notes, mood emoji/notes, wellbeing score | Yes | Yes | No | App Functionality | `drizzle/schema.ts:30,74,76,77,78` |
| **User Content** | Other User Content — medications, dosages, schedules, med logs, appointments (user-entered organizational data — **see section (c)**) | Yes | Yes | No | App Functionality | `drizzle/schema.ts:205-262` (elderMedications, medicationLogs, elderAppointments) |
| **User Content** | Other User Content — elder name & birthday (third-party PII the user enters about a relative) | Yes | Yes | No | App Functionality | `drizzle/schema.ts:26,38` (elders.name, birthday) |
| **Identifiers / Usage** | Diagnostics / Analytics / Usage data | **No** | — | — | — | No analytics or diagnostics SDK present (see section (b)). The Privacy page's "Umami" claim is **not implemented**. |
| **Location** | Any precise/coarse location | **No** | — | — | — | No location capture. `Info.plist` has no `NSLocationUsageDescription`. (`elderAppointments.location` is a free-text field the user types, not device location.) |
| **Health & Fitness** | HealthKit / health data | **No** | — | — | — | No HealthKit. See section (c). |

### Things that look like data types but are NOT Apple-declarable
- **Lemon Squeezy / RevenueCat / Stripe card details** — the app never sees or stores card numbers; only a subscription ID and customer ID (`drizzle/schema.ts:35-36`). Declare **Purchase History** (status), not "Payment Info." Stripe is a `package.json` dependency but **has no runtime usage in `server/` or `client/src/`** (grep for `from "stripe"` / `@stripe/stripe-js` returns nothing); `subscriptionContributions.stripeSubscriptionId` is a dormant schema column.
- **Referral codes / invite codes** — internal app identifiers, not personal data types in Apple's taxonomy.

### Suggested answers to App Store Connect's flow
1. "Do you or your third-party partners collect data from this app?" → **Yes.**
2. Select: **Contact Info → Name, Email Address; Identifiers → User ID, Device ID; Purchases → Purchase History; User Content → Photos or Videos, Other User Content.**
3. For each: **Used for App Functionality (and Account Management where offered). Linked to the user: Yes. Used to track you: No.**
4. "Do you use data to track users?" → **No.**

---

## (b) Third-party / tracking determination

**No tracking SDKs found.** A code + dependency search for `segment, amplitude, mixpanel, facebook/fbsdk, google-analytics/gtag, posthog, sentry, appsflyer, adjust, branch, smartlook, heap, bugsnag, datadog` returned **only false positives** (string-`segment` variable in `server/storage.ts:42`, "Adjust the padding" comment in `sidebar.tsx`, Facebook **in-app-browser user-agent detection** in `client/src/components/InstallPrompt.tsx:26-28`). There is **no advertising SDK and no attribution/analytics SDK** in `package.json`.

**Third parties that receive data (service providers, NOT tracking):**

| Third party | Data it receives | Role | Constitutes "tracking" per Apple? |
|---|---|---|---|
| **Clerk** (`@clerk/express`, `@clerk/react`) | Name, email, user ID | Auth / identity provider | **No** — service provider for sign-in |
| **RevenueCat** (`@revenuecat/purchases-capacitor`) | Clerk user ID (as appUserID), elder ID attribute, purchase events | IAP entitlement broker (native iOS/Android) | **No** — App Functionality. *Note:* identity is passed (`iap.ts:57,98-101`), so RevenueCat data IS linked, but it is not cross-app advertising tracking. |
| **Lemon Squeezy** | Email, name, custom elder/user IDs | Web subscription payment processor | **No** — payment service provider (`server/lemonSqueezyRoute.ts:37,52-54`) |
| **Cloudflare R2** (`@aws-sdk/client-s3`) | Photos (elder/visit images) | Object storage | **No** — storage provider (`server/storage.ts`) |
| **Firebase Cloud Messaging** (`firebase-admin`) | Device push tokens | Push notification delivery | **No** — App Functionality (`server/push.ts`, tokens from `pushRouter.ts`) |
| **Resend** | Email address | Transactional email (reminders/digests) | **No** — service provider |
| **Railway** | All app data (hosting/DB) | Cloud host (US) | **No** — infrastructure |

**Determination: the app does NOT track users.** Answer "Used to Track You" = **No** for every data type. There are no ad networks, no data brokers, and no cross-app identifiers shared for advertising. You should **not** be prompted to add an `NSUserTrackingUsageDescription` / App Tracking Transparency prompt — and none exists in `Info.plist` (correct).

---

## (c) HealthKit / health-data finding

- **The app does NOT use HealthKit.** A search for `HealthKit`, `HKHealthStore`, `HKObjectType`, `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` across `*.swift`, `*.plist`, `*.ts`, `*.tsx`, `package.json` returned **zero matches**. `ios/App/App/Info.plist` contains only `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` — no health keys.
- **The medication / appointment / care-routine features are user-entered organizational content, not clinical health data captured from a device.** They are typed by family members (`elderMedications`, `medicationLogs`, `elderAppointments` in `schema.ts:205-262`).
- **Recommendation:** Declare these under **User Content → "Other User Content"**, **NOT** under "Health & Fitness." Declaring Health & Fitness would (a) be inaccurate, (b) invite extra Apple scrutiny, and (c) imply HealthKit integration the app does not have.
- The Terms page already correctly frames this with a strong "not a medical device / organisational aid only" disclaimer (`Terms.tsx:30-35, 82-110`) — keep that; it supports the "User Content, not Health" position and the 4+ rating.

---

## (d) Children / minors

- **Not directed at children.** The app is for adults coordinating care for elderly relatives. `APP-STORE-AGE-RATING.md` already targets **Apple 4+ / Google Everyone** with all-None questionnaire answers.
- **Recommendation:** Do **not** check "this app is directed to children" in App Store Connect. The app is general-audience, not a kids-category app. The Privacy page's COPPA-style "not directed at children under 13" statement (`Privacy.tsx:76-77`) is appropriate.
- Minor internal inconsistency to be aware of (not blocking): Privacy says "under 13" while Terms requires users be "at least 13" and "under 18 with parental consent" (`Terms.tsx:44`). Consistent and fine for a general-audience app.

---

## (e) Gap list — Privacy.tsx and Terms.tsx

### Privacy.tsx — issues to fix BEFORE submission

| # | Severity | Issue | Suggested fix |
|---|---|---|---|
| P1 | **High (accuracy/rejection risk)** | Claims **"privacy-respecting analytics (Umami)"** (`Privacy.tsx:37`) and "Our analytics tool (Umami) is cookieless" (`:95`). **No Umami or any analytics code exists in the app.** A privacy policy that describes data practices the app doesn't perform is both inaccurate and can contradict your "No analytics/tracking" App Privacy answer. | Remove both Umami references. Either state "We do not use third-party analytics," or — only if you actually add Umami later — re-add it. As written today, **delete it.** |
| P2 | Medium | **RevenueCat is not disclosed** as a third party (`Privacy.tsx:60-67` lists Clerk, Lemon Squeezy, Resend, Cloudflare R2, Railway). The native app sends the Clerk user ID + purchase data to RevenueCat (`iap.ts:57,98-101`). | Add **"RevenueCat — in-app purchase processing and subscription management (native app)."** |
| P3 | Medium | **Firebase Cloud Messaging (FCM) is not disclosed.** Device push tokens are sent to Firebase to deliver notifications (`server/push.ts`, `pushRouter.ts`). | Add **"Firebase Cloud Messaging (Google) — push notification delivery."** |
| P4 | Medium | **Apple/Google in-app purchases** not mentioned. Native subscriptions go through Apple IAP via RevenueCat. | Add a line noting native subscriptions are processed through the App Store / Google Play and RevenueCat; web via Lemon Squeezy. |
| P5 | Low/Medium | **Device push token** is collected but not listed under "Information We Collect" (`Privacy.tsx:31-38`). | Add **"Device push token — a unique identifier from your device used solely to deliver reminder notifications."** |
| P6 | Low | **Care/medical organizational data not itemized.** Section 1 lists profile/visit data but not medications, dosages, appointments, mood notes (`schema.ts:205-262, 76-78`). | Add **"Care information — medications, dosages, schedules, appointments, and mood notes you choose to enter. This is organizational data you provide; it is not health data collected from a device or HealthKit."** (This also reinforces the User-Content-not-Health stance.) |
| P7 | Low | **Stripe mention absent / dormant** — fine, but `subscriptionContributions.stripeSubscriptionId` exists in schema. Since Stripe has no runtime usage, no disclosure needed. Just don't add Stripe to the policy. | No action (noted for completeness). |
| P8 | Low | "No IP addresses are stored" (`:37`) is tied to the false Umami claim and is unverifiable/irrelevant once Umami is removed. | Remove together with P1. |

**Positives in Privacy.tsx (keep):** account-deletion + 30-day retention (`:55`) — and this is **code-backed**: `auth.deleteAccount` wipes visits, notifications, elderMembers, elders, pushTokens, giftLogs, medicationLogs, referrals, referralSignups **and deletes the Clerk user** (`server/routers.ts:178-225`). The "no sale of data / no advertising" statement (`:49`) is accurate. Children's section (`:76`) appropriate. Family-member visibility section (`:71-72`) accurate.

### Terms.tsx — issues / gaps

| # | Severity | Issue | Suggested fix |
|---|---|---|---|
| T1 | Medium | **Native IAP not covered.** Section 8 says payments are processed "by Lemon Squeezy (via granwatch.app)" only (`Terms.tsx:118`). Native iOS/Android subscriptions go through **Apple/Google IAP via RevenueCat** (`iap.ts`). Apple requires that App Store purchase/billing terms (auto-renew, manage/cancel via the App Store) be stated. | Add: "In the iOS and Android apps, Gran+ is sold as an auto-renewing subscription through the Apple App Store / Google Play. Payment is charged to your App Store/Google account; manage or cancel in your account settings at least 24 hours before renewal. On the web, payment is processed by Lemon Squeezy." |
| T2 | Low | Governing law is South Africa (`:169`); refund handling "at our discretion" (`Terms.tsx:120`, Privacy n/a). For App Store IAP, Apple/Apple-region refund policies apply and you cannot fully disclaim them. | Note that App Store purchase refunds are handled by Apple per their policies. |
| T3 | Low (positive) | Medical disclaimer (`:30-35, 82-110`) and user-entry accuracy disclaimer (`:103-110`) are strong and directly support the "User Content, not Health data" classification. | Keep as-is. |
| T4 | Low | Account deletion (`:153-154`) is accurate and code-backed (`routers.ts:143-237`). | Keep. |

---

## Evidence appendix (key file:line)

- Users / contact info / identifiers: `drizzle/schema.ts:6-16`
- Elder profile (name, photo, birthday, care notes): `drizzle/schema.ts:24-42`
- Visit notes / photo / mood / wellbeing: `drizzle/schema.ts:69-86`
- Care content (meds, dosage, logs, appointments): `drizzle/schema.ts:205-262`
- Push tokens (device identifier): `drizzle/schema.ts:187-199`; insert `server/pushRouter.ts:35-44`
- Subscription / purchase status: `drizzle/schema.ts:34-37`
- RevenueCat: identity passed as appUserID `client/src/utils/iap.ts:57`; attributes `:98-101`
- Lemon Squeezy checkout (email/name sent): `server/lemonSqueezyRoute.ts:37,52-54`
- R2 photo storage: `server/storage.ts:70-74`
- FCM push: `server/push.ts:2-38`
- Account deletion (data + Clerk wipe): `server/routers.ts:143-237`
- No analytics/ad SDK: absent from `package.json`; only false-positive grep hits
- No HealthKit: zero matches across Swift/plist/TS; `ios/App/App/Info.plist` has only Camera + PhotoLibrary usage strings
- Age rating 4+: `APP-STORE-AGE-RATING.md`
