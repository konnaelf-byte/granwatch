# GranWatch — Test Cycle Plan (Build 7 round)
*Owner: Opus (lead dev / head of ops). Created 2026-06-23 from Konstand's TestFlight testing pass.*

## How the app updates (important)
The native app loads its UI live from `granwatch.app`. So most fixes **hot-deploy via Railway with no new TestFlight build**. Only genuinely native changes need **Build 7**.

---

## A. Needs Build 7 (native — new TestFlight build)
1. **Apple sign-in** — web-OAuth via Clerk (Services ID) inside the WebView. Code staged (NativeSignIn.tsx, App.tsx /sso-callback, capacitor.config allowNavigation, build bumped to 7).
2. **Widget status ring** — still doesn't show the logged-in gran's status. Needs native rebuild.
3. **Google account-picker after deletion** — native Google session caches last token; force account chooser / sign-out so re-signup works.

## B. Live deploy — no build needed
4. **Meds/appointments DB failure** — `elderAppointments` + `elderMedications` inserts fail = tables missing on prod. Verify + apply migration on Railway.
5. **New-profile "999 days / Never visited — ALERT!"** — change initial state to a calm "No visits logged yet" (no red alarm until a real baseline exists).
6. **Rename gated features for flexibility + lower liability:**
   - "Doctor's Appointments" → **"Appointments"** (placeholder suggestion: "Doctor's Appointment"; user can set physio, hairdresser, etc.)
   - "Medication" → **"Routines"** (or "Care Reminders") (suggestion: "Medication"; user can set "Blood pressure check", "Meds", "Physio stretches", etc.)
7. **Visit status freemium split:**
   - Free: fixed emoji set (😀 great / 🙂 okay / 😐 so-so / 🤒 unwell / ❤️)
   - Gran+: custom text note ("she's happy today", "flu simmering")
   - Structured emoji → enables **mood/visit trend charts** later (Gran+ feature).
8. **Delete/archive a gran without deleting the account** — prefer *archive* over hard-delete (domain-sensitive: a gran may pass away).

## C. Separate workstream — Gran+ in-app purchase
9. **Gran+ subscribe flow is missing** (expected — IAP not built). Blocks new users from upgrading.
   - **Blocker:** lock the free vs Gran+ split first (RevenueCat needs to know what's gated).
   - Then: App Store subscription product + RevenueCat (entitlement/offering/keys) + sandbox test + Restore Purchases.
   - **Recommendation:** don't gate this test cycle on IAP. Get auth + core UX solid first.

## D. Legal — parallel, no build dependency
10. **T&Cs liability cover** (not a lawyer — get a real review before launch). Must cover: not a medical device / not medical advice; don't rely on app for dosing/health decisions; no liability for data loss, downtime, or malfunction; no liability for inaccurate entries by family members; always confirm with a licensed professional. Add a short **in-app disclaimer at point of use**, not just buried terms.

---

## Device testing sequence (Konstand)
1. **Your iPhone** — verify Build 7 + live fixes until Apple/Google/email + meds/appointments + UX all solid.
2. **iPad** — catches layout / large-screen / split-view issues.
3. **Older iPhone** — catches performance + older-iOS compatibility + small-screen layout.

Don't fan out to 3 devices while things are still moving — stabilize on the primary iPhone first.

## Proposed free vs Gran+ split (to confirm)
- **Free:** 1 gran, visit logging, emoji status, family invite, basic alerts.
- **Gran+:** multiple grans, custom status notes, Appointments, Routines, trend charts, gifting.
*(Confirm before IAP wiring.)*
