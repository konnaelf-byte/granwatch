# Known Issues & Production Notes

*Last updated: 2026-06-19*

---

## ✅ Resolved

### Manus OAuth "Authorize params not found" (2026-04-16)
**Resolved** — GranWatch migrated from Manus OAuth to Clerk in May 2026. Clerk production keys are now live (pk_live_ / sk_live_). No Manus OAuth dependency remains.

### Railway env vars wiped by Raw Editor (2026-06-19)
**Resolved** — All 20 Railway environment variables were restored via the GraphQL API after a Raw Editor paste silently discarded them. Root cause: Railway's CodeMirror Raw Editor parser fails on values containing `\n` escape sequences (Firebase JSON private key). Fix: always use the GraphQL `variableUpsert` API for bulk or complex env var operations. See memory note for the full pattern.

---

## 🟡 Active — Non-Critical

### RevenueCat keys not set — IAP won't work in native app
**Status:** Pending Konna action
The RevenueCat dashboard has not been created yet. `REVENUECAT_SECRET_API_KEY`, `VITE_REVENUECAT_IOS_KEY`, and `VITE_REVENUECAT_ANDROID_KEY` are unset. The app handles this gracefully (logs a warning, no crash). Web flow is unaffected. IAP will remain non-functional until RevenueCat dashboard is set up.

**Action:** Follow REVENUECAT-SETUP-GUIDE.md. `REVENUECAT_WEBHOOK_AUTH_HEADER` is already pre-set in Railway.

### Lemon Squeezy ZAR variant unpublished
**Status:** Pending Konna action
The default ZAR R79/month variant (ID: 1681701) is in draft state in the LS dashboard. Checkout will fail for South African users until it's published.

**Action:** LS Dashboard → Products → Gran+ → Default variant → Publish.

### AUD $4.99 Lemon Squeezy variant missing
**Status:** Pending creation
`LS_VARIANT_ID_AUD` is not set. Australian users will fall back to the ZAR default until this variant is created.

**Action:** LS Dashboard → Products → Gran+ → Add variant (AUD $4.99) → copy ID → add `LS_VARIANT_ID_AUD` to Railway.

### assetlinks.json SHA256 is a placeholder
**Status:** Pending Android keystore generation
The `/.well-known/assetlinks.json` file contains `PLACEHOLDER_SHA256_FINGERPRINT`. Android App Links (deep linking into the native Android app) will not work until:
1. Android release keystore is generated
2. SHA256 fingerprint is extracted (`keytool -list -v -keystore my-release-key.jks`)
3. `PLACEHOLDER_SHA256_FINGERPRINT` is replaced in `client/public/.well-known/assetlinks.json`
4. Change committed and pushed

---

## 🔵 Notes

### Map.tsx is dead code
`client/src/components/Map.tsx` exists from a Manus scaffold but is never imported. Tree-shaken out of the production bundle. Can be deleted in a cleanup sprint.

### Stripe + stripe-js are unused dependencies
`stripe` and `@stripe/stripe-js` are in `package.json` from a Manus scaffold. Neither is imported anywhere. Add to cleanup list.

### VITE_PARTNER_FLOWERS_URL / VITE_PARTNER_GIFT_URL not set
The "🌸 Send Flowers" and "🎁 Send a Gift" buttons in ElderProfile.tsx fall back to `granwatch.app` when these env vars aren't set. Commission-earning affiliate links will only activate once partner agreements are in place and the URLs are added to Railway.
