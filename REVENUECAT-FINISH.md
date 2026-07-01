# RevenueCat — 15-minute finish (exact values, no thinking required)
*Everything here is fill-in-the-blank. Do it in order. The app CODE is already done & deployed.*

## Exact values you'll reuse
- Bundle ID: `app.granwatch`
- Entitlement identifier: `gran_plus`   ← must be exact (the app checks this)
- Product identifier: `gran_plus_monthly`   ← must be exact, matches App Store Connect
- Webhook URL: `https://granwatch.app/api/revenuecat/webhook`

---

## Step 1 — Connect your App Store app (needs the shared secret)
1. RevenueCat → **Project settings** (gear, bottom-left) → **Apps** → **+ New** → **App Store**.
2. App name: `GranWatch`  ·  Bundle ID: `app.granwatch`
3. **App-Specific Shared Secret** — get it from App Store Connect:
   - ASC → **Users and Access** → **Integrations** tab → **In-App Purchase** (left) → **App-Specific Shared Secret** → *(it's per-app)*. OR: ASC → your app → **App Information** → scroll to **App-Specific Shared Secret** → Manage → copy.
   - Paste it into RevenueCat. Save.
4. (Optional, can skip now) "In-App Purchase Key (.p8)" — only needed for Server Notifications v2. Skip for first test.

## Step 2 — Product
RevenueCat → **Product catalog → Products → + New → App Store** → identifier `gran_plus_monthly` → Save. (It should match/import from the app you just connected.)

## Step 3 — Entitlement
RevenueCat → **Product catalog → Entitlements → + New** → identifier **`gran_plus`** → create → then **Attach** product `gran_plus_monthly` to it.

## Step 4 — Offering (this is the screen you were on)
RevenueCat → **Product catalog → Offerings**. Make sure there's an offering set as **Current** (identifier `default` is fine). Inside it, add **one Package**:
- Package type: **Monthly** (`$rc_monthly`)
- Product: `gran_plus_monthly`
*(Delete the Yearly/Lifetime suggestions — we don't have those.)*

## Step 5 — Keys (copy these three; you'll paste into Railway in Step 6)
RevenueCat → **Project settings → API keys**:
- **Apple/iOS public SDK key** — starts with `appl_…`  → this is `VITE_REVENUECAT_IOS_KEY`
- **Secret key (v1)** — create one if needed  → this is `REVENUECAT_SECRET_API_KEY`

## Step 6 — Webhook
RevenueCat → **Project settings → Integrations → Webhooks → + New**:
- URL: `https://granwatch.app/api/revenuecat/webhook`
- **Authorization header value**: make up a strong random string (e.g. a 32-char password) and remember it → this is `REVENUECAT_WEBHOOK_AUTH_HEADER`
- Save.

## Step 7 — Railway env vars (paste the secrets here)
Railway → GranWatch project → the service → **Variables** → add three:
| Name | Value |
|---|---|
| `VITE_REVENUECAT_IOS_KEY` | the `appl_…` key from Step 5 |
| `REVENUECAT_SECRET_API_KEY` | the secret key from Step 5 |
| `REVENUECAT_WEBHOOK_AUTH_HEADER` | the exact string you set in Step 6 |

Railway auto-redeploys. (`VITE_…` is baked at build time → after the redeploy finishes, the live bundle has it, and your installed Build 7 picks it up next launch. **No new app build needed.**)

## Step 8 — Sandbox test on your iPhone (Build 7)
1. ASC → **Users and Access → Sandbox → Testers → +** → create a **Sandbox Apple ID** (use a fresh email).
2. iPhone → **Settings → Developer** (or **App Store**) → **Sandbox Account** → sign in with that sandbox tester. (Don't sign your real Apple ID out of the main App Store.)
3. Open GranWatch → a gran → **Care** tab (or Settings → Unlock with Gran+) → **Subscribe** → complete the sandbox purchase ($2.99, won't really charge).
4. Verify: the gran flips to **Gran+**, the Care section unlocks, and the **RevenueCat dashboard → Overview** shows the sandbox transaction + active `gran_plus` entitlement.
5. Test **Restore Purchases** on the same sandbox account.

If anything errors at Step 8, screenshot it and I'll diagnose — the code is in place, so it'll be a config value to double-check (usually the entitlement/product identifier spelling, or the iOS key not yet redeployed).

---
**That's the whole thing.** Once Step 8 passes, Gran+ works end-to-end and the only thing between you and the App Store is the listing metadata (already drafted in APP-STORE-SUBMISSION.md).
