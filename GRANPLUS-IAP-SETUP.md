# Gran+ In-App Purchase — Setup Checklist
*The CODE is done and deployed. These are the dashboard/config steps to make subscriptions actually work. No new TestFlight build needed — the app loads live and the RevenueCat plugin is already in Build 7.*

## What Claude needs from you (logins / 2FA Claude can't do)
These require your Apple + RevenueCat credentials, so they're yours to click (Claude can guide live).

### A. App Store Connect  (appstoreconnect.apple.com)
1. **Agreements, Tax, and Banking** → confirm the **Paid Apps** agreement is **Active** (bank + tax forms done). IAP stays inactive until this is green.
2. **Your app → Subscriptions** → create a **Subscription Group** (e.g. "GranWatch Subscriptions").
3. Inside it, create an **auto-renewable subscription**:
   - Product ID: **`gran_plus_monthly`**  ← must match exactly
   - Duration: 1 month · Price: **US$2.99**
   - Reference name: `Gran+ Monthly`
4. Add **localization** (English): display name **Gran+**, a short description.
5. Add a **review screenshot** of the Gran+ purchase screen + review notes (needed at submission).

### B. RevenueCat  (app.revenuecat.com)
1. Create a **Project**, add an **App Store app** → enter the Bundle ID `app.granwatch` + the **App-Specific Shared Secret** (from App Store Connect → App Information).
2. **Entitlement** id: **`gran_plus`**  ← must match exactly
3. Register the **product** `gran_plus_monthly`.
4. Create the **current Offering** with a package containing `gran_plus_monthly`.
5. Copy the **iOS public SDK key** (`appl_…`) and a **Secret API key**.
6. Add a **Webhook** → URL `https://granwatch.app/api/revenuecat/webhook`, with an Authorization header value you choose (must match the Railway var below).

### C. Railway env vars (Claude can set these once you have the keys)
- `VITE_REVENUECAT_IOS_KEY` = the `appl_…` public key
- `REVENUECAT_SECRET_API_KEY` = the secret key
- `REVENUECAT_WEBHOOK_AUTH_HEADER` = the webhook auth value (confirm it matches RevenueCat)
*(After setting these, redeploy so the live bundle picks up the key — no app rebuild.)*

### D. Sandbox test (on your current Build 7)
1. App Store Connect → Users and Access → **Sandbox** → create a Sandbox tester Apple ID.
2. iPhone → Settings → App Store → **Sandbox Account** → sign in with the tester.
3. In GranWatch, open a gran → **Care tab** or **Settings → Unlock with Gran+** → Subscribe → complete the sandbox purchase ($2.99).
4. Verify: the gran flips to Gran+, Care unlocks, and RevenueCat shows the transaction.
5. Test **Restore Purchases** on a fresh install.

## Status
- ✅ Code: purchase, restore, webhook, entitlement verification, native upsell on Profile + Settings — done & live.
- ⏳ Blocked on: the dashboard steps above (A + B), then Claude wires C, then you test D.
- ❌ New build: NOT required.
