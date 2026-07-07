# Submission day — 2026-07-08

## Overnight state
- **Build 12** archived with push VERIFIED IN BINARY (167 Firebase symbols — Build 11's
  plugin was silently dropped by a stale Xcode cache; root-caused and fixed with a clean
  rebuild). Upload to App Store Connect was running when the night ended — **check
  Xcode Organizer**: if the 1.0 (12) row says "Uploaded to Apple", done. If it's still
  stuck on "Selecting account…": click Cancel → Distribute App → Distribute (3 clicks).
- **Web features shipped** (already live on granwatch.app + inside the app):
  Add-to-Calendar fix (opens in Safari → Calendar), routine 7-day history dots +
  "Done ✓" wording, admin can remove non-admin members, admin can regenerate the
  invite code (kills leaked links).
- Email notifications: CONFIRMED WORKING (Konna received the day-14 test).

## Morning test list (Konna, ~5 min)
1. TestFlight → install **Build 12** → sign in → Dashboard → **Accept notifications
   prompt** → tell Claude to check pushTokenCount (expect 1). GranWatch should now
   also appear in iPhone Settings → Notifications.
2. Book a visit → Add to calendar → should open Safari with an event → Add.
3. Gran Care routine → tap Done → dot strip appears; "Done ✓" wording.
4. Family tab → confirm remove-member (👤−) and invite-code refresh (🔄) buttons.

## Submission checklist (App Store Connect)
1. **Screenshots** — capture per SCREENSHOT-SHOT-LIST.md (6.7" iPhone set is the
   only mandatory size). Konna captures on her phone, uploads in ASC.
2. App Store version 1.0 → select **Build 12** once processed.
3. **Attach the Gran+ subscription** (gran_plus_monthly) to this version — first
   IAP must ride along with the app review submission.
4. **App Review notes**: provide a demo login (create a spare account with a demo
   gran + some visits; do NOT use your real admin account) + note that a Gran+
   sandbox purchase unlocks Gran Care.
5. Verify metadata (APP-STORE-METADATA.md), age rating 4+, privacy answers
   (APP-PRIVACY.md).
6. Submit for Review.

## Known non-blockers (1.1 backlog)
- Notification preference toggles (mute social pushes; mother's/father's day opt-in).
  Defaults already match the NB-only policy (21d red alert, 14d longest-absent nudge,
  birthday) — nothing user-hostile ships today.
- Social pushes ("Sam just visited Gran Sophie") — build together with prefs.
- granwatch.com → Cloudflare NS delegation + redirect (waiting on Manus NS check).
