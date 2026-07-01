# GranWatch — App Store Submission Package
*Paste-ready listing copy, privacy answers, and a submission checklist. Drafted by Opus 2026-06-23 night. Review/tweak before submitting.*

---

## 1. App Store listing copy

**App Name (30 char max):**
`GranWatch`

**Subtitle (30 char max):**
`Never let Gran go unvisited`

**Promotional Text (170 char max — editable anytime without review):**
`Keep the whole family looking after the people who matter most. Log visits, get gentle reminders, and make sure Gran is never forgotten. 💛`

**Keywords (100 char max, comma-separated, no spaces):**
`gran,grandparent,elderly,care,family,visit,reminder,senior,checkin,wellbeing,mom,dad,caregiver`

**Description:**
```
GranWatch helps your whole family make sure the people you love are never forgotten.

Life gets busy, and weeks slip by. GranWatch gives every family a simple, shared way to keep an eye on Gran (or Grandpa, Mom, or Dad) — so someone always visits, and everyone knows how they're doing.

EVERYONE IN THE FAMILY, ON THE SAME PAGE
• Create a profile for your loved one and invite the whole family with one code
• A colour-coded status ring shows at a glance how long it's been since a visit
• Gentle alerts when it's been too long, so a visit never slips through the cracks

LOG VISITS IN SECONDS
• Tap to log a visit and reset the clock
• Add a quick mood — how were they feeling? — and a note for the family
• See a shared history of who visited and when

SHOW YOU CARE
• Send flowers or a gift to your loved one in a couple of taps

GRAN+ (optional subscription)
Upgrade any profile to Gran+ to unlock deeper care tools:
• Routines — track medications, blood-pressure checks, physio, and daily habits
• Appointments — keep doctor, physio, and other appointments in one place
• Private mood notes on each visit
• Mood trends over time, so you can see how they've really been

GranWatch is built with love for families who want to care better, together.

IMPORTANT: GranWatch is an organisational and reminder aid only. It is not a medical device and does not provide medical advice. Always confirm medications, doses, and health decisions with a qualified healthcare professional.
```

**Support URL:** `https://granwatch.app` (confirm a support/contact page exists)
**Marketing URL (optional):** `https://granwatch.app`
**Privacy Policy URL:** `https://granwatch.app/privacy` (confirm live)

**What's New (for this version):**
```
The first release of GranWatch. Create a profile for your loved one, invite your family, log visits, and make sure Gran is never forgotten. 💛
```

---

## 2. App Privacy questionnaire (App Store Connect → App Privacy)
*Answer truthfully; below is the expected mapping based on the current build. Verify against actual data use.*

Data collected and linked to the user's identity:
- **Contact Info → Name**: account profile (via Clerk). Purpose: App Functionality.
- **Contact Info → Email Address**: account/auth (via Clerk). Purpose: App Functionality.
- **User Content → Other (visit notes, mood, care/routine entries, photos)**: Purpose: App Functionality.
- **Identifiers → User ID**: account identity. Purpose: App Functionality.
- **Purchases**: subscription status (Gran+). Purpose: App Functionality.

Likely NOT collected (confirm): precise location, contacts, browsing history, search history, advertising data. (No ads, no third-party tracking — confirm no analytics SDK is sending data, or declare it if so.)

Tracking: **No** (app does not track users across other companies' apps/sites) — confirm no ad/tracking SDKs.

> NOTE on health data: care routines/medications are USER-ENTERED organisational content, not HealthKit data. The app does not use HealthKit. Frame as "User Content," not "Health & Fitness," and keep the not-a-medical-device disclaimer prominent.

---

## 3. Age Rating
- Suggested: **4+** (no objectionable content).
- Answer "None" to all violence/sexual/profanity/gambling/horror questions.
- Medical/Treatment Info: the app is a reminder aid, not medical advice — if asked about "Medical/Treatment Information," answer honestly; it's generally **None/Infrequent** for an organisational tool. Keep the disclaimer in the description.

---

## 4. App Review notes (paste into the version's App Review Information)
```
GranWatch is a family eldercare app. Sign in with Apple, Google, or email.

DEMO ACCOUNT: [provide a test email + password OR a Sign in with Apple test note]
- After signing in, tap "Create" to add a gran profile, or use invite code [____] to join an existing family.

GRAN+ SUBSCRIPTION: Gran+ is a $2.99/month auto-renewable subscription that unlocks the Care section (routines & appointments), private mood notes, and mood-trend charts. To reach the purchase: open a gran profile → tap the "Care" tab (or Settings → Unlock with Gran+) → Subscribe.

GranWatch is an organisational/reminder aid only — not a medical device and not medical advice.
```
> ACTION: create a demo account for the reviewer (or confirm Sign in with Apple works for review) and fill in the bracketed bits.

---

## 5. Pre-submission checklist
- [ ] Gran+ subscription → **Ready to Submit** (upload the review screenshot — `gran-plus-review-1242x2208.png` is ready)
- [ ] RevenueCat configured (entitlement `gran_plus`, offering with `gran_plus_monthly`, keys) — see GRANPLUS-IAP-SETUP.md
- [ ] Railway env vars set: `VITE_REVENUECAT_IOS_KEY`, `REVENUECAT_SECRET_API_KEY` (+ webhook header) → redeploy
- [ ] Sandbox-test a real Gran+ purchase + Restore Purchases on Build 7
- [ ] App Store screenshots uploaded (6.9"/6.7" required) — can reuse real app screens; needs 1290×2796 or 1320×2868
- [ ] App icon present (1024×1024, no alpha)
- [ ] App Privacy questionnaire completed
- [ ] Age rating completed
- [ ] Privacy Policy URL + Support URL live
- [ ] Demo account created + App Review notes filled in
- [ ] Attach the subscription to this version (In-App Purchases section on the version page) — required for the FIRST subscription
- [ ] Export compliance (encryption) question answered (standard HTTPS → usually "exempt")
- [ ] Select Build 7 (or latest) for the version, then Submit for Review

---

## 5b. App Store screenshots — capture fresh ones (≈2 min)
*Apple requires screenshots at 6.9"/6.7" (e.g. 1290×2796 or 1320×2868). I can resize whatever you capture to the exact accepted size — I just need clean source shots. The ones currently in Downloads are mostly debug/error screens, so don't use those.*

Set up first: a tidy test account with a real-sounding gran name (e.g. "Nana May"), at least one logged visit, and ideally Gran+ active so Care shows real entries. Then capture these 4–5 screens (portrait, no error banners, no invite code visible if avoidable):
1. **Dashboard** — the colour-coded status ring(s). This is the signature visual.
2. **A gran profile** — status + "Log Visit / Book Visit" buttons.
3. **Log a Visit** — the mood picker (😔→🥰) + notes. Shows the caring simplicity.
4. **Care tab (Gran+)** — Routines + Appointments populated (the premium value).
5. **Family / invite** — "invite the whole family" (optional 5th).

AirDrop them to the Mac and tell me — I'll resize each to the exact App Store size and hand them back ready to upload. (Captions/device frames optional; Apple accepts plain screenshots.)

## 6. Still outstanding (non-submission)
- Widget blank — parked for a dedicated debug build (App Group data-bridge log).
- Android — staged config exists; Play Console signup + build is a later track.
