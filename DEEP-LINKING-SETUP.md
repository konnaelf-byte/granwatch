# Deep Linking Setup — iOS Universal Links & Android App Links

## What was done

Three files were added/modified to enable deep linking so that `granwatch.app/join/:code` and `granwatch.app/elder/:id` URLs open directly in the native app rather than the browser.

### Files created

| File | Purpose |
|------|---------|
| `client/public/.well-known/apple-app-site-association` | iOS Universal Links verification file |
| `client/public/.well-known/assetlinks.json` | Android App Links verification file |

Both files land in `dist/public/.well-known/` after `pnpm build` (Vite copies `client/public/` verbatim).

### Server routes added (`server/_core/index.ts`)

Two explicit `GET` routes serve the `.well-known` files **before** Clerk auth middleware with `Content-Type: application/json` and `Cache-Control: no-store`. This is required because:

- Apple's AASA crawler and Google's Digital Asset Links verifier both need a direct `200` response — no redirects.
- The files must be served without auth checks.

---

## What you still need to do

### iOS — Xcode

1. **Configure signing in Xcode** (`ios/App/App.xcodeproj`):
   - Select the `App` target → Signing & Capabilities.
   - Choose your team. Xcode will populate the Team ID (10-character string like `A1B2C3D4E5`).

2. **Update the AASA file** with your real Team ID:
   - Open `client/public/.well-known/apple-app-site-association`.
   - Replace both occurrences of `XXXXXXXXXX` with your actual Team ID.
   - Redeploy (Railway will pick up the change automatically on push).

3. **Add the Associated Domains capability** in Xcode:
   - Target → Signing & Capabilities → `+` → Associated Domains.
   - Add: `applinks:granwatch.app`
   - Also add: `webcredentials:granwatch.app` (for future Shared Web Credentials / Passkeys support).

### Android

1. **Get the SHA-256 fingerprint** of your release keystore:
   ```bash
   keytool -list -v -keystore your-release-key.jks -alias your-key-alias
   ```
   Copy the `SHA256:` line — it looks like `AB:CD:EF:...` (32 colon-separated hex pairs).

2. **Update `client/public/.well-known/assetlinks.json`**:
   - Replace `PLACEHOLDER_SHA256_FINGERPRINT` with the real fingerprint string.
   - Redeploy.

---

## Verification

### iOS

Use the Branch AASA validator (no account needed):
```
https://branch.io/resources/aasa-validator/
```
Enter `granwatch.app` and confirm the `/join/*` and `/elder/*` paths are listed.

Apple's own CDN validator (may be cached for up to 24 h after a change):
```
https://app-site-association.cdn-apple.com/a/v1/granwatch.app
```

### Android

Google's Digital Asset Links API:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://granwatch.app&relation=delegate_permission/common.handle_all_urls
```
You should see a `200` response listing your app's package name and fingerprint.

On-device test (Android 6+):
```bash
adb shell am start -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d "https://granwatch.app/join/TESTCODE"
```
The native app should open directly without a browser chooser.
