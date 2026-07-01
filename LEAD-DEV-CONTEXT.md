# GranWatch — Lead Dev Context

> **For:** Claude Opus (lead dev role)  
> **Subagent:** Claude Sonnet — can be delegated implementation tasks (file edits, bash commands, git commits)  
> **Owner:** Konna (Konstand) — konnaelf@icloud.com  
> **Last updated:** 2026-06-22  
> **Project folder:** `/Users/konnaseelf/Documents/Claude/GranWatch data from Manus`

---

## What GranWatch Is

A family coordination app for tracking visits to elderly relatives. Built for diaspora families (South Africans abroad, OFW communities, Indian diaspora) who want to make sure gran is being visited and cared for. Core loop: family members log visits, the app tracks who visited, sends nudges when gran hasn't been seen in a while.

**Live at:** https://granwatch.app  
**Repo:** https://github.com/konnaelf-byte/granwatch (public, default branch: `main`)  
**Auto-deploy:** Every push to `main` deploys to Railway automatically (GitHub native integration).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, TypeScript, Vite |
| Routing | Wouter 3 (lightweight, Capacitor-compatible) |
| Backend | Express 4, tRPC 11, Node.js |
| Database | MySQL on Railway (Drizzle ORM + mysql2, auto-migrated at startup) |
| Auth | Clerk (production keys active — `pk_live_` / `sk_live_`) |
| Email | Resend — noreply@granwatch.app (DKIM/SPF/DMARC live) |
| Payments (web) | Lemon Squeezy — ZAR R79/month, KYC approved under Better Creation (Pty Ltd) |
| Payments (native) | RevenueCat — IAP client integrated; **dashboard setup pending** |
| File storage | Cloudflare R2 — bucket: `granwatch-media`, public: `https://media.granwatch.app` |
| Push | Firebase Admin SDK (project: `granwatch-d46f3`) |
| Native wrapper | Capacitor 8 — iOS + Android |
| Native state | TestFlight — Build 5 uploaded, sign-in fix in progress |

---

## Repository Structure (key paths)

```
/
├── client/src/
│   ├── App.tsx              # Router + SignInPage (Clerk <SignIn>)
│   ├── main.tsx             # ClerkProvider + tRPC + SW registration
│   ├── pages/               # Landing, Dashboard, ElderProfile, etc.
│   ├── components/          # DashboardLayout, NativeGranPlusModal, etc.
│   ├── utils/iap.ts         # RevenueCat IAP helpers
│   └── const.ts             # getSignInUrl()
├── server/_core/
│   ├── index.ts             # Express server entry
│   ├── trpc.ts              # tRPC router setup
│   ├── dataApi.ts           # DB queries (Drizzle)
│   └── notification.ts      # Push + nightly cron
├── ios/App/                 # Xcode project
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── GranWidgetPlugin.swift   # Capacitor plugin → App Groups UserDefaults
│   │   └── App.entitlements         # Push Notifications + Associated Domains
│   └── GranWatchWidget/     # WidgetKit extension
├── scripts/
│   └── fix-revenuecat-spm.mjs  # Patches CordovaPluginPurchases/Package.swift after cap sync
├── capacitor.config.json    # server.url: "https://granwatch.app"
├── .env.production          # VITE_CLERK_PUBLISHABLE_KEY=pk_live_*
└── package.json             # cap:build → build + cap sync + fix-revenuecat-spm.mjs
```

---

## Infrastructure — Railway

| Item | Value |
|------|-------|
| Project | lively-empathy (`6517d86b-d108-47bd-ab13-8ef79990e6e6`) |
| Environment | production (`6bff47b0-9fd8-461c-96ac-f3f64d51ef19`) |
| App service | granwatch (`f8cdc01f-2cac-418a-9058-5d016ec31853`) |
| MySQL service | `fa0e6415-5ba8-471b-89c0-546b6a5101b3` |
| Public URL | https://granwatch.app |
| GraphQL API | https://backboard.railway.com/graphql/v2 (session cookie auth) |

### CRITICAL — Railway Raw Editor Bug
**NEVER use Railway's Raw Editor for bulk or complex env vars.** The CodeMirror parser silently drops variables when any value contains multi-line content or JSON with `\n` (e.g. Firebase private key). This wiped all 20 env vars once. Always use the GraphQL API instead:

```javascript
// Run in browser console on railway.com (uses session cookie)
async function upsert(name, value) {
  const res = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation variableUpsert($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
      variables: { input: {
        projectId: "6517d86b-d108-47bd-ab13-8ef79990e6e6",
        environmentId: "6bff47b0-9fd8-461c-96ac-f3f64d51ef19",
        serviceId: "f8cdc01f-2cac-418a-9058-5d016ec31853",
        name, value
      }}
    })
  });
  return await res.json();
}
// Sequential calls with 800ms sleep between — parallel hits rate limits
```

---

## Key Credentials (already in Railway env vars)

| Key | Value |
|-----|-------|
| CLERK publishable key | `pk_live_Y2xlcmsuZ3JhbndhdGNoLmFwcCQ` (frontend API: `clerk.granwatch.app`) |
| DATABASE_URL | `mysql://root:sDqYgnCIZSxoyESIIakPHRdDDtrMlSMG@kodama.proxy.rlwy.net:48733/railway` |
| R2_ACCOUNT_ID | `e0f186e2021ba0b47b313eae11ab4692` |
| R2_PUBLIC_URL | `https://media.granwatch.app` |
| LS_STORE_ID | `354262` |
| LS_VARIANT_ID | `1681701` (ZAR R79/month — currently draft, needs publishing) |
| OWNER_CLERK_ID | `user_3E1e7unXpC2cQyBZicgm1Tvjf7e` |
| Firebase project | `granwatch-d46f3` |
| REVENUECAT_WEBHOOK_AUTH_HEADER | `6641e00ed6d16c425b498093b2846d5ef0f627845bb374f47fa717760b86eba7` |

---

## Apple Developer / iOS

| Item | Value |
|------|-------|
| Team | Better Creation (Pty Ltd) |
| Team ID | `BFA6JYY9YD` |
| Bundle ID | `app.granwatch` |
| Capacitor App ID | `app.granwatch` |
| Signing (Release) | Manual — "GranWatch Distribution" + "GranWatch Widget Distribution" provisioning profiles |
| TestFlight | Build 5 uploaded ✅ (GranWatch 1.0 (5)) |

---

## Current State — Native App (as of 2026-06-22)

### What works
- ✅ Build 5 on TestFlight — app loads, home screen visible
- ✅ Back button on sign-in page (native only)
- ✅ iOS home screen widget (WidgetKit — Xcode setup guide written)
- ✅ RevenueCat IAP client integrated (NativeGranPlusModal)

### Active problem: Blank sign-in page
When a user taps "Sign in", "Get started", or "Start for free" in the TestFlight build, they reach the sign-in page but the **Clerk `<SignIn>` component renders blank** — no form, no email field, nothing.

**Root cause (diagnosed):** Two interacting issues:
1. `routing="path"` tells Clerk to own the URL path, which triggers internal redirects that WKWebView handles differently from Safari
2. The service worker's `controllerchange` handler calls `window.location.reload()` — this fires during Clerk's first-time initialization in the native WebView, causing the component to mount and then be wiped

### Fix committed — needs pushing
Commit `d2b3605` on `main` fixes both issues:

**`client/src/App.tsx`** — use `routing="virtual"` on native:
```jsx
<SignIn routing={isNative ? "virtual" : "path"} path={isNative ? undefined : "/sign-in"} />
```

**`client/src/main.tsx`** — skip SW registration on native:
```js
const isCapacitorNative = !!(window as any).Capacitor?.isNative || !!(window as any).Capacitor?.isNativePlatform?.();
if ("serviceWorker" in navigator && import.meta.env.PROD && !isCapacitorNative) {
```

**Action needed from Konna:** Push the commit:
```bash
cd "/Users/konnaseelf/Documents/Claude/GranWatch data from Manus"
git push origin main
```
(The Sonnet sandbox can't push to GitHub directly due to a proxy restriction — Konna must run this.)

After Railway deploys (~2 min), the fix is live — **no Xcode rebuild needed** because `capacitor.config.json` has `server.url: "https://granwatch.app"`, so the native app loads all JS/CSS from the live server.

---

## How the Native App Loads (important)

`capacitor.config.json` has:
```json
{ "server": { "url": "https://granwatch.app" } }
```

This means the Capacitor WebView **fetches all content from the live Railway deployment** instead of bundled assets. So:
- Code changes deployed to Railway take effect in TestFlight immediately (no new build needed)
- The native Capacitor bridge is still injected → `Capacitor.isNativePlatform()` returns `true`
- The app bundle in the App Store only needs rebuilding when changing Swift/Xcode code, Capacitor config, or native plugins

---

## Known Technical Gotcha — RevenueCat SPM

`cap sync` regenerates `ios/capacitor-cordova-ios-plugins/sources/CordovaPluginPurchases/Package.swift` from a template that only declares `capacitor-swift-pm` as a dependency. But the Swift source files import `RevenueCat` and `PurchasesHybridCommon` — so every archive fails with "Unable to resolve module dependency."

**Fix:** `scripts/fix-revenuecat-spm.mjs` patches the file after every `cap sync`. It's wired into `package.json`:
```json
"cap:build": "npm run build && npx cap sync && node scripts/fix-revenuecat-spm.mjs"
```
The fixed `Package.swift` adds `purchases-ios-spm` 5.78.0 and `purchases-hybrid-common` 18.15.1 to dependencies and target dependencies. The script is idempotent.

When archiving in Xcode: always use the **GUI** (Product → Archive), not `xcodebuild` CLI. The GUI resolves transitive SPM dependencies of local packages correctly; CLI cannot.

---

## CRITICAL Constraint — No Web Redirects for Payments

> "Navigating to website from local app is a barrier to entry risk we're not willing to take."

**All iOS/Android subscription flows MUST use native IAP (RevenueCat / StoreKit / Google Play Billing).** Never redirect native app users to Lemon Squeezy or any web checkout. Lemon Squeezy is web-only (browser/landing page).

This is a hard product decision, not a preference. Do not suggest or implement web-redirect payment flows for the native app.

---

## Strategy

- **Priority #1:** Get as many users as possible — native app is primary product, web is secondary
- **Monetisation primary:** Gifting commissions — "Send Gran Flowers 🌸", "Send Gran a Gift 🎁" (GranWatch takes % of each transaction). This is more important than subscription revenue.
- **Monetisation secondary:** Gran+ subscription ($2.99/month) via native IAP
- **Target markets:** Diaspora families — SA expats, OFW communities (Philippines), Indian diaspora. Partnership contacts exist for AU, NL, BR.

---

## Pending Blockers (Konna must action)

1. **Push `d2b3605`** → triggers Railway deploy → fixes blank sign-in page
2. **RevenueCat dashboard:** Create project, `gran_plus_monthly` product, entitlement, offering → add `REVENUECAT_SECRET_API_KEY`, `VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY` to Railway
3. **App Store Connect:** Create `gran_plus_monthly` IAP ($2.99/month auto-renewable)
4. **Lemon Squeezy:** Publish ZAR variant (1681701) — currently draft
5. **TestFlight group:** Add build 5 to a testing group in App Store Connect (Konna)
6. **Sign in with Apple:** Configure in Clerk Dashboard (Service ID: `com.granwatch.app.signin`, Team ID: `BFA6JYY9YD`, Key ID + .p8 key) — needed before App Store submission

---

## Shipped Features (complete, in production)

- Regional pricing + geolocation (IP → tier, LS variant routing)
- SEO improvements (JSON-LD, OG meta, structured data)
- Referral program backend (codes, tracking, 1-month free)
- Push notification backend (FCM, pushTokens table, nightly cron at 18:00 UTC)
- Gran+ care schedule (medications + doctor visits, gated behind `isPaid`)
- RevenueCat IAP client (NativeGranPlusModal, $2.99/month)
- Gifting buttons (🌸 Flowers + 🎁 Gift, giftLogs table, merged activity timeline)
- Deep linking (apple-app-site-association + assetlinks.json + server routes)
- Offline service worker (Workbox — disabled in native Capacitor shell, active on web)
- Accessibility (VoiceOver, Dynamic Type, skip link)
- iOS WidgetKit home screen widget (setup guide: `WIDGETKIT-SETUP-GUIDE.md`)
- Android build.gradle + AndroidManifest verified for Play Store

---

## Post-MVP Roadmap

1. iOS home screen widget → needs Xcode setup (guide written, Konna to follow)
2. Multilingual: Tagalog + Spanish (Phase 2)
3. Care Coordinator dashboard for facilities (B2B2C — Phase 3)

---

## Working with Sonnet (Subagent)

Claude Sonnet (this project's Cowork session) has file access and shell access to this project folder. It can:
- Read, write, edit files
- Run bash commands (`mcp__workspace__bash`)
- Commit to git (though cannot push to GitHub — Konna must push)

Sonnet cannot:
- Push to GitHub (sandbox proxy blocks it — always tell Konna to run `git push origin main`)
- Access Railway dashboard directly (use GraphQL API pattern above)
- Archive Xcode builds (Konna must do this in Xcode GUI on their Mac)

When delegating implementation: be specific about file paths, exact changes, and whether a Railway deploy or Xcode rebuild is needed afterward.
