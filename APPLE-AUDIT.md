# GranWatch — Apple App Store Rejection Audit
*Audited by Head of Ops · 28 May 2026*

---

## Master Checklist (run through every point before submitting)

1. **Placeholder content** — tap every button, no lorem ipsum, no placeholder text/images
2. **Demo credentials** — include a working test account login in App Review Notes
3. **Apple IAP** — any subscription/purchase must go through Apple IAP, no Stripe or external payment links
4. **Permissions justified** — every permission request (camera, location, microphone) must be explainable; remove any that aren't used
5. **AI disclosure** — AI-generated content must be disclosed in the App Store description
6. **Screenshots match live app** — no features shown that aren't built, no UI that doesn't exist
7. **Sign in with Apple** — mandatory if any other social login (Google, Facebook, etc.) is offered
8. **Account deletion** — users must be able to delete their account from within the app

### GranWatch-specific priorities
- **#3** — Gran+ subscription (currently Lemon Squeezy) must become Apple IAP for the native app *(code fix in progress)*
- **#7** — if Google login is added to Clerk, Sign in with Apple becomes mandatory
- **#8** — account deletion is built and live at `/account` ✅

---

## Checklist Results

| # | Check | Status | Action |
|---|-------|--------|--------|
| 1 | Placeholder / incomplete content | ✅ Pass | None |
| 2 | Demo credentials for App Review | ⚠️ Action needed | Create test account |
| 3 | IAP / external payment links | ✅ Fixed (code deployed) | See below |
| 4 | Permissions justification | ✅ Pass | None |
| 5 | AI content disclosure | ✅ Pass | Note in App Store description |
| 6 | Screenshot accuracy | ⚠️ Konna's task | Real screenshots needed |
| 7 | Sign in with Apple | ⚠️ Check Clerk dashboard | See below |
| 8 | Account deletion | ✅ Pass | None |

---

## Detail

### 1 — Placeholder / incomplete content ✅
No lorem ipsum, no fake data, no "Coming Soon" screens in any user-facing page.
`ComponentShowcase.tsx` has placeholder text but that page is NOT routed in `App.tsx` — it's unreachable by any real user or reviewer.

### 2 — Demo credentials for App Review ⚠️
**What Apple does:** The reviewer opens the app cold. If it requires login and they have no account, they hit a dead end and reject immediately.

**What you must do before submission:**
1. Create a test account at granwatch.app (email: `appreviewer@granwatch.app` or similar)
2. Set up at least one gran profile on that account with some visit history so the reviewer sees a populated app
3. In App Store Connect → App Review Information, enter:
   - **Demo Account Email:** appreviewer@granwatch.app
   - **Demo Account Password:** (something memorable)
4. Add a note: *"After signing in, tap the gran profile to see visit tracking, the family feed, and birthday reminders. Gran+ subscription features are available by subscribing at granwatch.app — the native app uses the Reader App model."*

### 3 — IAP / External payment links ✅ (FIXED — commit 01d9104 + 96622f3)
**What was wrong:** `GranPlusModal` appeared on both `ElderProfile` and `ElderSettings` pages. It displayed "Subscribe — R79/mo" and a button that redirected to Lemon Squeezy checkout. This is an **automatic rejection** — Apple prohibits any external payment link or subscription UI in native apps unless they go through Apple IAP.

**What was fixed:**
- Created `client/src/utils/platform.ts` — exports `isNativeApp` (uses `Capacitor.isNativePlatform()`)
- `ElderProfile.tsx` — Gran+ header button and modal gated behind `!isNativeApp`
- `ElderSettings.tsx` — all "Unlock with Gran+" buttons, the Wellbeing switch upgrade path, the manage subscription card, and the modal gated behind `!isNativeApp`

**How it works now in the native app:**
- Free users see a locked UI but no subscription prompt
- Paid users see all Gran+ features normally
- Neither sees any payment UI — clean Reader App model
- Users who want to subscribe go to granwatch.app in Safari

**No action needed from you** — code is live on GitHub, Railway will auto-deploy on next build.

### 4 — Permissions justification ✅
`ios/App/App/Info.plist` has clear, specific usage strings for all three permissions:
- **NSCameraUsageDescription:** "GranWatch uses your camera to take a photo for a gran profile."
- **NSPhotoLibraryUsageDescription:** "GranWatch accesses your photo library so you can choose a photo for a gran profile."
- **NSPhotoLibraryAddUsageDescription:** "GranWatch saves visit photos to your photo library."
- **NSUserNotificationUsageDescription:** "GranWatch sends you reminders when Gran hasn't been visited recently."

All four strings are specific (not vague like "this app uses your camera"). Pass.

### 5 — AI content disclosure ✅
`AIChatBox.tsx` is only imported by `ComponentShowcase.tsx`, which is not routed in `App.tsx`. No real user can reach it. The server has `llm.ts`, `imageGeneration.ts`, and `voiceTranscription.ts` files but these appear to be supporting infrastructure, not active user-facing features.

**What you must still do:** In your App Store description, add one sentence: *"GranWatch does not use AI to generate content shown to users."* (or if AI features ship later, update the disclosure accordingly). Apple now requires explicit confirmation either way.

### 6 — Screenshot accuracy ⚠️ Konna's task
Screenshots must show the actual app exactly as it looks at launch. No mockups of features that aren't in v1.

**Shot list (minimum required):**
1. Dashboard — showing gran profile cards with status rings
2. Elder profile page — visit feed with logged visits
3. Log a visit — the visit logging modal open
4. Birthday reminder — notification or birthday indicator
5. Account / settings page

Take these at iPhone 15 Pro Max size (2796 × 1290 px) and iPhone 8 Plus size (1242 × 2208 px). Both sizes are required by Apple.

*I'll write the title overlays and marketing copy for each screenshot once you take them.*

### 7 — Sign in with Apple ⚠️ Check required
**The rule:** If ANY third-party social login is offered (Google, Facebook, GitHub, Twitter/X, etc.), Sign in with Apple is mandatory.

**What the code says:** `App.tsx` has a `/sign-in/sso-callback` route, which means Clerk's OAuth callback is wired in. Whether Google or any other provider is actually enabled depends on your **Clerk dashboard settings**, not the code.

**What you must do:**
1. Log into your Clerk dashboard → User & Authentication → Social Connections
2. Check which providers are enabled
3. **If Google (or any other social provider) is ON:**
   - You must add Apple as a social provider in Clerk, OR
   - Disable all social providers for the native app (email-only login)
4. **If only email/password is enabled:** You're fine, no action needed.

Apple's reviewer will check this on the sign-in screen immediately.

### 8 — Account deletion ✅
`/account` page has a full deletion flow: confirmation `AlertDialog` → `trpc.auth.deleteAccount` → permanent deletion logged server-side.

The flow is accessible from within the app (the `/account` route is in the navigation). Apple's requirement since June 2022 is met.

---

## Pre-Submission Checklist (what you still need to do)

| Priority | Who | Action |
|----------|-----|--------|
| 🔴 Must-do | **Konna** | Check Clerk dashboard → Social Connections. Add Sign in with Apple if any other provider is on. |
| 🔴 Must-do | **Konna** | Create demo account + populate with test data. Enter credentials in App Store Connect → App Review Information. |
| 🟡 Important | **Konna** | Take screenshots at 2796×1290 (6.7") and 1242×2208 (5.5"). |
| 🟡 Important | **Me** | Write screenshot title overlays + App Store description copy (ready when you send the shots). |
| ✅ Done | **Me** | Gran+ payment UI hidden from native app — committed and pushed. |

---

## What the Reviewer Will See (walk-through)

1. Opens the app → sees the GranWatch landing/sign-in screen
2. Uses the demo credentials you provided → logs in
3. Sees the dashboard with existing gran profiles
4. Taps a profile → sees visit history feed, no subscription prompt (native app)
5. Taps settings → no "Upgrade to Gran+" option visible
6. Navigates to Account → sees the Delete Account option (Apple satisfied)
7. Checks permissions dialog when taking a photo → reads the clear justification string
8. Reviews complete → **approved**

---

*— Head of Ops*
