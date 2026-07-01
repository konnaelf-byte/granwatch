# GranWatch iOS Widget — Blank Data Diagnosis

**Date:** 2026-06-24
**Symptom:** Widget renders (tappable, opens app) but shows no gran data — empty rings only — even after Build 7.
**Scope of this doc:** Root-cause ranking, exact Xcode + Apple portal verification steps, the device-console test procedure, and the diagnostic log lines staged in native code for the next build.

---

## 1. What the code trace confirms (the bridge logic is correct)

I traced the full path end-to-end. Every contract matches across the JS and native sides:

| Constant | JS / write side | Widget / read side | Match |
|---|---|---|---|
| App Group suite | `group.app.granwatch` (`GranWidgetPlugin.swift:29`) | `group.app.granwatch` (`GranWatchWidget.swift:24`) | ✅ |
| UserDefaults key | `granwatch_widget_data` (`GranWidgetPlugin.swift:30`) | `granwatch_widget_data` (`GranWatchWidget.swift:25`) | ✅ |
| Widget kind (reload) | `GranWatchWidget` (`GranWidgetPlugin.swift:31`) | `GranWatchWidget` (`GranWatchWidget.swift:26`) | ✅ |
| JSON envelope | `{ "grans": [...] }` (`GranWidgetPlugin.swift:43`) | `WidgetPayload { grans: [GranEntry] }` (`GranWatchWidget.swift:38`) | ✅ |
| Entry fields | `id, name, status, lastVisitLabel, ringFraction` (`GranWidget.ts:25`) | identical `GranEntry` (`GranWatchWidget.swift:28`) | ✅ |

Other verified facts:
- **Plugin name matches:** JS `registerPlugin('GranWidget')` ↔ Swift `jsName = "GranWidget"`. Capacitor auto-registers `@objc(GranWidgetPlugin)` — no manual `AppDelegate` registration needed, and none is missing.
- **Both Swift files are in the build:** `GranWidgetPlugin.swift` is in the App target's Sources phase; `GranWatchWidget.swift` is in the widget target's Sources phase (`project.pbxproj` lines 240, 248). Widget `.appex` is embedded in the App (line 40).
- **Sync IS wired and fires post-auth:** `useWidgetSync()` is called in `client/src/pages/Dashboard.tsx:15`. It runs only on native iOS, fetches `trpc.elders.list`, maps the first 4 elders, and calls `GranWidget.updateWidgetData({ grans })`.
- **The server payload is valid and non-empty:** `elders.list` (`server/routers.ts:276–280`) returns `id, name, status, daysSinceVisit, alertThresholdDays`. `status` is exactly `"green"|"yellow"|"orange"|"red"` (`getStatus`, `routers.ts:69`), which is exactly what the Swift decoder expects. So a successfully-fetched, non-empty elder list produces a valid, decodable payload.

**Conclusion: there is no bug in the data shape, the keys, the plugin registration, or the render code.** The failure is almost certainly in the *shared container* itself — i.e. the two processes are not actually sharing the same `group.app.granwatch` UserDefaults at runtime. The most common cause of that is the App Groups entitlement being present in the `.entitlements` file but **not provisioned in the signing profile**.

---

## 2. Ranked root-cause hypotheses

### #1 — App Group not provisioned in the signing profile — **HIGH confidence (~70%)**
The entitlement files (`App.entitlements`, `GranWatchWidget.entitlements`) both declare `group.app.granwatch`, and both targets point `CODE_SIGN_ENTITLEMENTS` at them. **But:**

- The Release builds use **`CODE_SIGN_STYLE = Manual`** with named profiles `"GranWatch Distribution"` (app) and `"GranWatch Widget Distribution"` (widget) — `project.pbxproj` lines 424/438 and 478/493.
- The project has **no `SystemCapabilities` / `com.apple.ApplicationGroups.iOS` block** in `TargetAttributes` (`project.pbxproj` lines 179–187). That block is what Xcode writes when App Groups is enabled through the **Signing & Capabilities** UI. Its absence means the App Group was added by hand-editing the entitlement plist, not through the capability toggle.

With **manual signing**, an entitlement in the file is only honored on-device if the **provisioning profile** was generated against an **App ID that has the App Groups capability enabled** and that the **specific group `group.app.granwatch` is registered to**. If either App ID (`app.granwatch` and `app.granwatch.widget`) is missing the App Groups capability or the group, then at runtime `UserDefaults(suiteName: "group.app.granwatch")` falls back to **standard defaults / a non-shared container** — the app writes to one sandbox, the widget reads from another, and the widget sees nothing. This exactly matches the symptom (widget runs fine, just no shared data).

This is the single most likely cause and the cheapest to verify.

### #2 — App Group entitlement enabled on app but mismatched/absent on the widget App ID — **MEDIUM (~12%)**
A sub-case of #1. Two separate App IDs each need the App Groups capability AND must both include the *same* group. It's common for the main app's App ID to be configured but the widget's (`app.granwatch.widget`) to be overlooked — the app writes successfully but the widget still can't read. The staged logs will distinguish this (WRITE OK + READ nil-suite).

### #3 — Data never written (sync didn't fire / empty list) — **LOW–MEDIUM (~10%)**
`useWidgetSync` early-returns when `elders.length === 0` (`useWidgetSync.ts:84`). If the user has no elders, or if `elders.list` hasn't resolved when the widget refreshes, nothing is written and the widget legitimately shows empty. Also `isNative` must be true (it is, in the native build). The WRITE logs will confirm whether `updateWidgetData` is ever called and with how many grans.

### #4 — Timelines not reloaded — **VERY LOW (~3%)**
`reloadTimelines(ofKind: "GranWatchWidget")` is called, and the timeline also self-refreshes every 30 min (`getTimeline`, policy `.after(refresh)`). Even with no manual reload, the widget would pick up data within 30 min. Since it's blank indefinitely, stale-timeline is not the cause. Ruled near-out.

### #5 — Widget decode/render bug — **VERY LOW (~2%)**
Decoder shape matches the writer exactly, and the empty-state path is the *correct* behavior when `grans` is empty. No coercion or optional-field mismatch found. Ruled near-out.

---

## 3. Verify / enable App Groups — exact steps

### A. Xcode — Signing & Capabilities (do this on BOTH targets)
1. Open `ios/App/App.xcodeproj` in Xcode.
2. Select the **App** target → **Signing & Capabilities** tab.
3. Look for an **App Groups** capability card. **If it is missing**, click **+ Capability** (top-left) and add **App Groups**.
4. In the App Groups card, ensure **`group.app.granwatch`** is present and its checkbox is **ticked**. If absent, click **+** under the group list and add `group.app.granwatch` exactly.
5. Repeat steps 2–4 for the **GranWatchWidget** target — it needs the **same** `group.app.granwatch`, ticked.
6. Confirm the **Team** is `BFA6JYY9YD` on both targets. Confirm both targets' **bundle IDs**: app = `app.granwatch`, widget = `app.granwatch.widget`.
7. After adding the capability, Xcode should write a `SystemCapabilities`/`com.apple.ApplicationGroups.iOS` entry into the project and keep the existing `group.app.granwatch` in each `.entitlements` file. (The entitlement files are already correct — the goal is to make the *capability + profile* match them.)

> Note: Release config is **Manual** signing. If you keep manual signing, the App Groups capability must also be reflected in the **provisioning profiles** (next section). The quickest path to eliminate this variable for a diagnostic build is to temporarily switch both targets to **Automatically manage signing** with team `BFA6JYY9YD` — Xcode will then regenerate profiles with the capability included. Revert to manual + your distribution profiles for the actual App Store build once confirmed.

### B. Apple Developer portal — App IDs + App Group
1. developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. **App Groups:** ensure a group `group.app.granwatch` exists (Identifiers → filter **App Groups**). Create it if missing.
3. Open App ID **`app.granwatch`** → **Capabilities** → ensure **App Groups** is checked → **Edit/Configure** → tick **`group.app.granwatch`** → Save.
4. Open App ID **`app.granwatch.widget`** → same: **App Groups** checked → configure → tick **`group.app.granwatch`** → Save.
5. **Profiles:** regenerate the two distribution profiles **`GranWatch Distribution`** and **`GranWatch Widget Distribution`** so they pick up the updated App Group capability (editing capabilities invalidates existing profiles). Download and install them (or let Xcode automatic signing handle it).
6. Rebuild (bump to Build 8) and re-archive.

---

## 4. Device-console test procedure (the next build will tell you exactly where it breaks)

Diagnostics have been staged in the native code (section 5). Both the app and the widget log to the **same subsystem** so you can see both halves of the bridge in one filter.

1. Build & run Build 8 on a **physical device** (widgets + App Groups behave differently in Simulator; test on-device).
2. On the Mac, open **Console.app** → select the connected iPhone in the left sidebar → click **Start** (streaming).
3. In the search/filter bar, enter:  `subsystem:app.granwatch.widget`
4. **Trigger the WRITE path:** open the GranWatch app and go to the Dashboard (where `useWidgetSync` runs). Make sure you are signed in and have at least one gran.
5. **Trigger the READ path:** add/remove the widget on the home screen, or wait for a timeline refresh, to force `loadPayload()` to run.

### What to look for (and what each pattern means)

**Healthy bridge (everything working):**
```
WRITE: updateWidgetData called with 3 grans
WRITE: UserDefaults(suiteName: group.app.granwatch) is non-nil ✓
WRITE: wrote 412 bytes for key granwatch_widget_data; read-back = 412 bytes
WRITE: reloadTimelines(ofKind: GranWatchWidget) requested
READ: OK — 412 bytes, decoded 3 grans
```

**Hypothesis #1/#2 — App Group not provisioned (THE EXPECTED FAILURE):**
```
WRITE: UserDefaults(suiteName: group.app.granwatch) returned NIL — App Group likely NOT provisioned
```
…or the app writes fine but the widget can't see it:
```
WRITE: ... read-back = 412 bytes          ← app side OK
READ: UserDefaults(suiteName: group.app.granwatch) NIL — widget can't see App Group   ← widget App ID missing the group (#2)
```
> Note: on iOS, `UserDefaults(suiteName:)` rarely returns literal nil even when the group isn't entitled — it can silently fall back to standard defaults. So the **most diagnostic line is the READ side**: if WRITE shows a healthy `read-back` but READ shows `NO data for key`, the two processes are NOT sharing a container → App Group provisioning mismatch. That is the signature of #1/#2.

**Hypothesis #3 — data never written / empty:**
```
(no "WRITE:" lines at all)                 ← useWidgetSync never called updateWidgetData (not signed in? not on Dashboard? not native?)
WRITE: updateWidgetData called with 0 grans ← empty elder list
WRITE: rejected — missing 'grans' parameter ← JS sent a malformed payload
```

**Hypothesis #4 — reload issue:** WRITE all healthy + READ never appears even after re-adding the widget → timeline not reloading (unlikely; re-adding always forces a snapshot).

**Hypothesis #5 — decode bug:**
```
READ: found 412 bytes but DECODE failed — JSON shape mismatch
```

The decision tree: **WRITE healthy + READ "NO data for key" (or nil suite) = App Groups not shared → fix per section 3.** That is the predicted outcome.

---

## 5. Diagnostic lines added (TEMP DIAGNOSTIC — remove after confirmation)

All additions are clearly commented `// TEMP DIAGNOSTIC` and are no-throw `os_log` calls (no behavior change, compiles cleanly). Line numbers are post-edit.

**`ios/App/App/GranWidgetPlugin.swift`**
- Line 19: `import os.log`
- Lines 22–24: `granLog` OSLog handle (subsystem `app.granwatch.widget`, category `bridge`)
- Line ~39: log rejection when `grans` param missing
- Line ~44: log that `updateWidgetData` was called + gran count
- Lines ~50–62: split the original two-part `guard` into separate checks; log JSON-serialise failure, log whether `UserDefaults(suiteName:)` is nil vs non-nil (the App-Group canary)
- Lines ~72–74: log bytes written + immediate read-back byte count from the same suite
- Line ~79: log that `reloadTimelines` was requested

**`ios/App/GranWatchWidget/GranWatchWidget.swift`**
- Line 19: `import os.log`
- Lines 21–23: `granWidgetLog` OSLog handle (same subsystem `app.granwatch.widget`, category `widget`)
- `loadPayload()` (lines ~71–90): split the original combined `guard` into three stages, each logging which stage failed — nil suite, no data for key, or decode failure — plus a success line with byte + gran counts.

### Removal
After the root cause is confirmed, delete every line marked `// TEMP DIAGNOSTIC`, the two `import os.log` lines, and the two OSLog handles, and restore the two combined `guard` blocks to their original form. No other code references these.
