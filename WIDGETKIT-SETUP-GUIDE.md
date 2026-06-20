# GranWatch Widget — Xcode Setup Guide

**Time required:** ~30–45 minutes  
**Prerequisite:** Xcode installed; `ios/App/App.xcodeproj` opens successfully  
**Apple Developer account:** logged in (you need to sign the Widget extension target)

All the Swift and TypeScript code has already been written for you.  
Your job is to wire it into Xcode so the compiler knows about it.

---

## What You're Adding

| File | Where | Purpose |
|------|-------|---------|
| `GranWatchWidget.swift` | `ios/App/GranWatchWidget/` | The widget UI + timeline |
| `GranWatchWidget.entitlements` | `ios/App/GranWatchWidget/` | App Groups for the widget target |
| `GranWidgetPlugin.swift` | `ios/App/App/` | Capacitor plugin (writes data from JS → App Groups) |
| `App.entitlements` *(updated)* | `ios/App/App/` | App Groups added to the main app |

---

## Step 1 — Open the project

Open `ios/App/App.xcodeproj` in Xcode.

---

## Step 2 — Add the Widget Extension target

1. In the top menu: **File → New → Target…**
2. In the template picker, scroll to **Widget Extension** → click **Next**
3. Fill in:
   - **Product Name:** `GranWatchWidget`
   - **Team:** `Better Creation Pty Ltd (BFA6JYY9YD)`
   - **Bundle Identifier:** `app.granwatch.widget`
   - **Include Configuration Intent:** ❌ **Uncheck** (we use static widgets)
4. Click **Finish**
5. Xcode will ask: *"Activate 'GranWatchWidget' scheme?"* → click **Activate**

Xcode creates a new group `GranWatchWidget` with some placeholder files.

---

## Step 3 — Replace Xcode's placeholder file with ours

Xcode generated a placeholder `GranWatchWidget.swift`. Replace it:

1. In the Project Navigator, expand the **GranWatchWidget** group
2. **Delete** the auto-generated `GranWatchWidget.swift` (click → Delete → Move to Trash)
3. Right-click the **GranWatchWidget** group → **Add Files to "App"…**
4. Navigate to `ios/App/GranWatchWidget/GranWatchWidget.swift`
5. Make sure **"Add to targets"** shows **GranWatchWidget** ✅ (not `App`)
6. Click **Add**

> ⚠️ Also delete `GranWatchWidgetBundle.swift` and any `GranWatchWidgetLiveActivity.swift` that Xcode auto-created — our `GranWatchWidget.swift` has its own `@main` entry point.

---

## Step 4 — Set the Widget target's entitlements file

1. In the Navigator, click the **GranWatchWidget** entitlements file Xcode created  
   (it's usually named `GranWatchWidget.entitlements` inside the GranWatchWidget group — if it already exists and looks correct, you can skip the next sub-step)
2. **Replace it** with our version:
   - Delete the auto-generated one (Delete → Move to Trash)
   - Right-click the **GranWatchWidget** group → **Add Files to "App"…**
   - Select `ios/App/GranWatchWidget/GranWatchWidget.entitlements`
   - Target: **GranWatchWidget** only → **Add**
3. Tell Xcode to use this file:
   - Click the **GranWatchWidget** target (in the target list at the top left)
   - Go to **Signing & Capabilities** tab
   - Next to **Code Signing Entitlements**, make sure it shows `GranWatchWidget/GranWatchWidget.entitlements`

---

## Step 5 — Enable App Groups on the Widget target

1. Still in **GranWatchWidget → Signing & Capabilities**
2. Click **+ Capability** → search for **App Groups** → double-click
3. Click **+** under the App Groups list
4. Enter exactly: `group.app.granwatch`
5. Click **OK**

Xcode will register this App Group with Apple automatically when you next build.

---

## Step 6 — Enable App Groups on the main App target

1. In the target list, select the **App** target (the main GranWatch app)
2. Go to **Signing & Capabilities**
3. Click **+ Capability** → **App Groups**
4. Click **+** → enter: `group.app.granwatch`
5. Click **OK**

> The `App.entitlements` file in the repo already has this key — Xcode just needs to acknowledge it in the capabilities UI.

---

## Step 7 — Add GranWidgetPlugin.swift to the App target

1. In the Project Navigator, expand the **App** group
2. Right-click → **Add Files to "App"…**
3. Navigate to and select `ios/App/App/GranWidgetPlugin.swift`
4. Make sure **"Add to targets"** shows **App** ✅ (not `GranWatchWidget`)
5. Click **Add**

---

## Step 8 — Set the minimum deployment target

WidgetKit and `@main` on widget extensions require **iOS 16+**.

1. Click **GranWatchWidget** target → **General** tab
2. Set **Minimum Deployments** to **iOS 16.0**

Do the same for the main **App** target if it's below 16.

---

## Step 9 — Build and verify

1. Select scheme **App** → any iPhone simulator
2. Press **⌘B** (Build)
3. Fix any errors (most common: "GranWatchWidget" not in `App Groups` — double check Step 5 and 6)

To preview the widget in Xcode:

1. Switch scheme to **GranWatchWidget** in the scheme picker
2. Run on any simulator (**⌘R**)
3. Tap the home screen → long-press → tap **+** (top left) → search **GranWatch**
4. You'll see the small/medium/large previews with the placeholder data (Gran, Nan, Nana, Pop)

Once the main App is run and you add at least one elder, the widget will show real data.

---

## Step 10 — Set `aps-environment` to `production` before TestFlight

The main `App.entitlements` currently has `aps-environment = development`. Before uploading to TestFlight/App Store, change it to `production`:

1. Open `ios/App/App/App.entitlements` in Xcode
2. Change the value of `aps-environment` from `development` to `production`

(Or do this during the Archive step — it's safe to leave as `development` for local testing.)

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `App Group "group.app.granwatch" not found` | Make sure both targets have the capability added AND you've signed in to your Apple Developer account in Xcode Preferences |
| `UserDefaults(suiteName:) returns nil` | Confirms App Group isn't registered — redo Step 5 |
| Widget shows empty rings (no data) | App hasn't run yet to push data; open the app, wait for elders to load, then check the widget |
| `Multiple @main types` error | Delete the auto-generated `GranWatchWidgetBundle.swift` — see Step 3 note |
| `Cannot find type 'CAPPlugin'` in GranWidgetPlugin.swift | GranWidgetPlugin was added to the wrong target — it must be in **App**, not GranWatchWidget |
| Widget doesn't update after logging a visit | `WidgetCenter.shared.reloadTimelines` is called by the Capacitor plugin — confirm `GranWidgetPlugin.swift` was added to the App target (Step 7) |

---

## Data flow recap (for reference)

```
User opens GranWatch app
  → Dashboard.tsx loads (useWidgetSync hook is mounted)
  → tRPC elders.list query fires → returns [{id, name, status, daysSinceVisit, alertThresholdDays}]
  → useWidgetSync computes ringFraction (max 0.07–1.0) + lastVisitLabel
  → GranWidget.updateWidgetData({ grans }) is called
  → Capacitor routes to GranWidgetPlugin.swift
  → Writes JSON to UserDefaults(suiteName: "group.app.granwatch")["granwatch_widget_data"]
  → Calls WidgetCenter.shared.reloadTimelines(ofKind: "GranWatchWidget")
  → iOS asks GranWatchWidget.swift for a new timeline
  → GranWatchWidget.swift reads UserDefaults → renders ring grid on home screen
```

The widget also self-refreshes every 30 minutes (via the `Timeline` policy) even if the app is closed.
