# Known Issues & Production Notes

*Last updated: 2026-08-24 (overnight audit — removed 3 stale entries overtaken by later events; see Resolved (cont.))*

---

## ✅ Resolved

### Manus OAuth "Authorize params not found" (2026-04-16)
**Resolved** — GranWatch migrated from Manus OAuth to Clerk in May 2026. Clerk production keys are now live (pk_live_ / sk_live_). No Manus OAuth dependency remains.

### Railway env vars wiped by Raw Editor (2026-06-19)
**Resolved** — All 20 Railway environment variables were restored via the GraphQL API after a Raw Editor paste silently discarded them. Root cause: Railway's CodeMirror Raw Editor parser fails on values containing `\n` escape sequences (Firebase JSON private key). Fix: always use the GraphQL `variableUpsert` API for bulk or complex env var operations. See memory note for the full pattern.

---

## 🟡 Active — Non-Critical

(none currently — see Resolved (cont.) below for items closed out by later events)

---

## ✅ Resolved (cont.)

### assetlinks.json SHA256 was a placeholder — now RESOLVED (confirmed 2026-08-24)
This file previously listed `PLACEHOLDER_SHA256_FINGERPRINT`. Confirmed live on 2026-08-24: `client/public/.well-known/assetlinks.json` now contains 3 real SHA256 fingerprints for `app.granwatch` — resolved as a byproduct of the real Android release keystore generated for the live Aug 20 Google Play launch. Android App Links should work; not independently device-tested, but the placeholder is gone.

### RevenueCat keys "not set" — STALE, overtaken by events (caught 2026-08-24 overnight)
This entry (last written 2026-06-19) said the RevenueCat dashboard didn't exist yet. It's long since been superseded: RC is fully wired (STATUS.md, Aug 20) — a real Android Gran+ purchase went through Play → RevenueCat → server, the webhook was verified live (401 on bad auth, no auth-mismatch retries in logs), and iOS IAP has been live since Aug 11. Removed from Active; no action needed.

### LS ZAR variant unpublished / AUD variant missing — STALE, overtaken by events (caught 2026-08-24 overnight)
Both entries (last written 2026-06-19) assumed the old per-country ZAR/AUD pricing model. Commit `f361986` (Aug 14, Konna's call Aug 13) repriced Gran+ to a single flat $2.99/mo USD worldwide and changed the LS **store currency** itself from ZAR to USD — the per-country-variant machinery these two issues were about no longer reflects how pricing works. Not independently re-verified inside the LS dashboard tonight (no login credentials available to this assistant — same hard rule as always), but the STATUS.md commit trail confirms the underlying model changed. Flagging for Konna to give the LS dashboard a quick glance next time he's in there, just to eyeball that nothing's in a half-migrated state — but not treating this as an open issue anymore.

---

## 🔵 Notes

### Map.tsx is dead code
`client/src/components/Map.tsx` exists from a Manus scaffold but is never imported. Tree-shaken out of the production bundle. Can be deleted in a cleanup sprint.

### Stripe + stripe-js are unused dependencies
`stripe` and `@stripe/stripe-js` are in `package.json` from a Manus scaffold. Neither is imported anywhere. Add to cleanup list.

### VITE_PARTNER_FLOWERS_URL / VITE_PARTNER_GIFT_URL not set
The "🌸 Send Flowers" and "🎁 Send a Gift" buttons in ElderProfile.tsx fall back to `granwatch.app` when these env vars aren't set. Commission-earning affiliate links will only activate once partner agreements are in place and the URLs are added to Railway.
