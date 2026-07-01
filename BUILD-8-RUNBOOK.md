# Build 8 — RevenueCat + Widget → App Store

**Goal:** ship the RevenueCat native fix (Gran+ purchases work) + the widget (status rings + gran photos), then submit to the App Store.
**Scope:** iOS only. Push notifications are deliberately **NOT** in this build (that's Build 9 — see `granwatch_notifications_status`).
**Repo state:** archive from `main` @ `ddac139` or later. Contains the RevenueCat SPM fix (`46b2907`) + widget photo code.

Do the steps **in order**. Steps 1–2 are the two that make RevenueCat and the widget actually work; skipping either wastes the build.

---

## 0. Pre-flight (Terminal)
```bash
cd "/Users/konnaseelf/Documents/Claude/GranWatch data from Manus"
git checkout main && git pull            # confirm you're on ddac139+
git status                                # must be clean
```

## 1. Build the web + native bridge — **REQUIRED for RevenueCat**
This runs the SPM fix that links the RevenueCat Capacitor plugin into the binary (the whole reason Build 7 failed). It also copies the updated widget Swift + web assets.
```bash
npm run cap:build
```
`cap:build` = `vite build` → `cap sync` → `node scripts/fix-revenuecat-spm.mjs`.
Watch the tail for: `[fix-revenuecat-spm] ✅ Patch 2a: Wrote Package.swift…` and `✅ Patch 2b…`. If you don't see the ✅ lines, stop and tell me — RevenueCat won't link without them.

## 2. App Groups provisioning — **REQUIRED for the widget to show any data**
The widget entitlement already lists `group.app.granwatch`, but the ring/photo data only crosses from app → widget if the **App Group is provisioned in the signing profiles**. This is the #1 cause of the blank widget (full analysis in `WIDGET-DIAGNOSIS.md`).

**Xcode → Signing & Capabilities (do for BOTH targets):**
1. Open `ios/App/App.xcodeproj`.
2. **App** target → Signing & Capabilities → ensure an **App Groups** card exists with **`group.app.granwatch`** ticked. Add it (+ Capability → App Groups) if missing.
3. **GranWatchWidget** target → same: **`group.app.granwatch`** ticked.
4. Team = `BFA6JYY9YD` on both. Bundle IDs: app = `app.granwatch`, widget = `app.granwatch.widget`.

**Apple Developer portal (developer.apple.com → Identifiers):**
5. App Group `group.app.granwatch` exists (create under Identifiers → App Groups if not).
6. App ID **`app.granwatch`** → App Groups capability ON → configure → tick `group.app.granwatch`.
7. App ID **`app.granwatch.widget`** → same.
8. Regenerate the two distribution profiles (**GranWatch Distribution**, **GranWatch Widget Distribution**) so they include the App Group, then let Xcode download them.
> Fast path to remove this variable: temporarily set both targets to **Automatically manage signing** (team `BFA6JYY9YD`) for this build — Xcode regenerates profiles with the App Group included.

## 3. Resolve Swift packages (RevenueCat)
Xcode → **File → Packages → Reset Package Caches** → wait for SPM to finish resolving (it will download + compile `PurchasesCapacitor`). No red errors in the package list.

## 4. Bump build number to 8
Xcode → **App** target → General → set **Build** = `8` (keep Version `1.0`). Do the same on the **GranWatchWidget** target so they match.

## 5. Archive & upload
1. Toolbar device selector → **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. Organizer → **Distribute App → App Store Connect → Upload**.
4. Wait for the build to finish processing in App Store Connect / TestFlight (~5–15 min).

## 6. On-device verification (install Build 8 from TestFlight)
**RevenueCat (the headline fix):**
- Open a gran → **Gran+**. The price should now show a real amount (not `—`), and the red error banner should be **gone**.
- Tap **Subscribe** → the native Apple sheet appears → complete the sandbox purchase → the gran flips to Gran+. Confirm the transaction shows in the RevenueCat dashboard.

**Widget:**
- Add the GranWatch widget to the home screen. Sign in, open the **Dashboard** (this triggers the sync). Rings + names should appear; each gran's **photo** shows in the ring centre (initials if no photo set).
- If still blank: on the Mac, Console.app → select iPhone → filter `subsystem:app.granwatch.widget`. `READ: OK …` = working. `READ: … NO data for key` or `NIL … App Group` = App Group provisioning (step 2) didn't take.

## 7. Submit to the App Store
Once TestFlight confirms RevenueCat + widget work:
- App Store Connect → the 1.0 version → attach the **Gran+** subscription to the submission.
- Confirm screenshots + metadata (see `APP-STORE-SUBMISSION.md`).
- **Submit for Review.**

---

## If something breaks
- **RevenueCat still errors in Build 8** → step 1 ✅ lines didn't appear, or step 3 didn't re-resolve. Re-run `cap:build`, Reset Package Caches, re-archive.
- **Widget still blank** → step 2 provisioning. The device-console `READ:` line tells you which side.
- **Photo missing but ring shows** → photo just hasn't downloaded yet (6h cache); it appears after the next Dashboard open. Initials are the intended fallback.

## After Build 8 ships → Build 9 (push)
Add `@capacitor-firebase/messaging` via SPM, client registration, guarded `FirebaseApp.configure()`, Push capability. Needs the Firebase iOS + Android config files. Server side is already done. See `granwatch_notifications_status` memory + task #4.
