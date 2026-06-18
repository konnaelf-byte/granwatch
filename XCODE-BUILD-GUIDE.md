# Xcode Build & TestFlight Upload Guide for GranWatch

**Who this is for:** Konna (non-developer)
**Xcode version:** 26.5
**Time needed:** ~30–60 minutes (plus 10–30 min waiting for Apple to process)
**What you'll end up with:** Your app available to test on TestFlight

---

## Before You Start

Make sure you have done the following:
- [ ] RevenueCat is set up (see `REVENUECAT-SETUP-GUIDE.md`)
- [ ] Railway environment variables are added
- [ ] Xcode 26.5 is installed on your Mac
- [ ] You are signed into your Mac with internet access
- [ ] Your iPhone is nearby for testing (you don't need it plugged in)

---

## Step 1 — Open the Xcode Project

1. Open **Finder** on your Mac
2. Navigate to your GranWatch project folder
3. Find the file at: `ios/App/App.xcodeproj`
4. **Double-click** `App.xcodeproj` to open it in Xcode

   **Alternative:** In Xcode, go to **File → Open** (or press `Cmd+O`), then navigate to the `ios/App/` folder and select `App.xcodeproj`.

5. Xcode will open. You'll see a panel on the left (the navigator) and a large editor area.

---

## Step 2 — Wait for Package Dependencies to Load

As soon as you open the project, Xcode will automatically start downloading Swift Package dependencies (this includes Capacitor, RevenueCat, and other libraries your app needs).

1. Look at the top of the Xcode window — you'll see a progress bar or spinning indicator and text like **"Resolving package graph"** or **"Downloading..."**
2. **Wait for this to finish completely.** It can take 2–5 minutes on the first open, especially on a slower internet connection.
3. If Xcode asks **"Do you trust the packages in this project?"**, click **"Trust & Open"**.

> Do not try to build the app until the progress indicator goes away and the status bar at the top shows no activity.

---

## Step 3 — Sign In to Your Apple Account in Xcode

If Xcode doesn't already know about your Apple ID, you need to add it now.

1. At the top of the screen, click **"Xcode"** in the menu bar
2. Click **"Settings..."** (or press `Cmd+,`)
3. Click the **"Accounts"** tab
4. If you don't see your Apple ID (`konnaelf@icloud.com` or the Better Creation account) listed, click the **"+"** button at the bottom-left
5. Select **"Apple ID"** and click **"Continue"**
6. Sign in with the Apple ID that belongs to Better Creation (Pty Ltd)
7. Close the Settings window

---

## Step 4 — Set Up Signing (Most Important Step)

This is what allows Apple to verify that the app comes from you. Get this wrong and the archive will fail.

1. In the left panel (navigator), click on the blue **"App"** icon at the very top — it has a small "A" icon and is the first item listed. This is the project file.

2. The middle area will now show project settings. You'll see two sections: **PROJECT** and **TARGETS**. Under **TARGETS**, click on **"App"** (the one with the app icon, not the first one which says "App" under PROJECT).

3. Click the **"Signing & Capabilities"** tab at the top of the settings area.

4. Make sure you're looking at the **"All"** or **"Release"** signing (not Debug). You'll see a dropdown that says "Debug" or "All" — select **"All"** if you can, or do this for both Debug and Release.

5. Check the box next to **"Automatically manage signing"**. If a popup appears asking to enable automatic signing, click **"Enable Automatic"**.

6. In the **"Team"** dropdown, select **"Better Creation (Pty Ltd)"**. If you don't see it, make sure you completed Step 3 and signed in with the correct Apple ID.

7. **Bundle Identifier:** Confirm the field shows `app.granwatch`. If it shows something different, click on it and type `app.granwatch`.

8. Xcode will show a **"Provisioning Profile"** row. After a few seconds, it should say something like "Xcode Managed Profile". If it shows a red error, see the troubleshooting section at the end.

---

## Step 5 — Add Push Notifications Capability

Your app sends notifications to family members, so this capability is required.

1. Make sure you're still on the **"Signing & Capabilities"** tab (from Step 4)
2. Click the **"+ Capability"** button (top-left of the Signing & Capabilities area)
3. A search box will appear — type **"Push"**
4. Double-click **"Push Notifications"** in the results
5. It will appear as a new section in your capabilities list

> If "Push Notifications" is already listed, skip this step — it's already added.

---

## Step 6 — Add Associated Domains Capability

This is needed for deep links so that links to `granwatch.app` open the app instead of a browser.

1. Still on the **"Signing & Capabilities"** tab
2. Click **"+ Capability"** again
3. Type **"Associated"** in the search box
4. Double-click **"Associated Domains"**
5. It will appear as a new section. Click the **"+"** button inside the Associated Domains section
6. Type: `applinks:granwatch.app`
7. Press **Enter**

---

## Step 7 — Select the Right Build Destination

This is critical for archiving — you cannot archive for a simulator, only for a real device.

1. Look at the **toolbar at the top of Xcode** — there's a device selector that looks like `App > [Device Name]`. It might currently say something like `iPhone 16 Pro (Simulator)` or your phone's name.

2. Click on that device selector dropdown

3. In the dropdown, look for a section called **"iOS Device"** or **"Any Device"**

4. Select **"Any iOS Device (arm64)"**

   > This option will only be available if you do NOT have a simulator name currently selected. If you don't see it, click "Platforms" or look in the top section of the dropdown, not the simulator section at the bottom.

The toolbar should now show: `App > Any iOS Device (arm64)`

---

## Step 8 — Archive the App

Archiving builds your app in release mode and packages it for distribution.

1. In the top menu bar, click **"Product"**
2. Click **"Archive"**

   > If Archive is greyed out, it usually means a simulator is still selected as the destination. Go back to Step 7.

3. Xcode will start building. You'll see a progress bar at the top of the window with messages like "Compiling...", "Linking...", "Archiving...". **This takes 5–15 minutes.** Just wait.

4. When it's done, the **Organizer window** will open automatically showing your archive. You'll see something like:
   ```
   GranWatch
   Jun 18, 2026, 2:30 PM
   ```
   with a green status indicator.

If the build fails, see the **Troubleshooting** section at the end.

---

## Step 9 — Upload to TestFlight

1. In the Organizer window, make sure your latest archive is selected (it will be highlighted in blue)

2. Click **"Distribute App"** on the right side

3. A dialog will appear. Select **"App Store Connect"** and click **"Next"**

4. On the next screen, select **"Upload"** (not Export) and click **"Next"**

5. On the distribution options screen:
   - **Strip Swift symbols:** leave checked
   - **Upload symbols:** leave checked
   - **Manage version and build number:** can leave on, this auto-increments your build number
   
   Click **"Next"**

6. Xcode will verify your app with Apple's servers. This can take 1–2 minutes. You'll see "Preparing your app for distribution..."

7. Click **"Upload"**

8. Xcode will upload the build. Progress is shown at the top. When done, you'll see a success message. Click **"Done"**.

---

## Step 10 — Find Your Build in TestFlight

After uploading, Apple needs to process the build. This usually takes 10–30 minutes.

1. Go to **https://appstoreconnect.apple.com**
2. Click **"My Apps"** → **GranWatch**
3. Click the **"TestFlight"** tab at the top
4. In the left sidebar, click **"iOS"** under "BUILDS"
5. Your build will appear here. While Apple is processing it, the status will say **"Processing"**
6. Once it changes to **"Ready to Submit"**, the build is ready

**Add Yourself as a Tester:**
1. In TestFlight, click **"App Store Connect Users"** under "INTERNAL TESTING"
2. Add yourself if you're not already there
3. You'll receive an email invite — open it on your iPhone and install TestFlight if you haven't already
4. In the TestFlight app on your iPhone, you'll see GranWatch available to install

---

## Troubleshooting Common Errors

### "No accounts in this team have the right permission" or "No accounts found"
- **Fix:** You're not signed in to Xcode with the right Apple ID. Go to **Xcode → Settings → Accounts** and add `konnaelf@icloud.com` (or the Better Creation account). Then go back to Step 4.

### "Provisioning profile doesn't include the Push Notifications entitlement"
- **Fix:** Click the red error — Xcode usually shows a **"Fix Issue"** button. Click it and let Xcode fix it automatically. Xcode will create a new provisioning profile that includes Push Notifications.

### "Provisioning profile with UUID ... is not installed"
- **Fix:** Go to **Xcode → Settings → Accounts**, select your Apple ID, click **"Download Manual Profiles"**. Then try archiving again.

### "Archive" is greyed out in the Product menu
- **Fix:** You have a simulator selected as the destination. See Step 7 — select "Any iOS Device (arm64)" instead.

### "Command PhaseScriptExecution failed with a nonzero exit code"
- **Fix:** This is often a build script error. Try:
  1. **Product → Clean Build Folder** (or press `Cmd+Shift+K`)
  2. Wait for it to finish, then try **Product → Archive** again
  3. If it still fails, quit Xcode completely, reopen the project, and try again

### The Organizer window doesn't open after the archive
- **Fix:** Go to **Window → Organizer** in the menu bar (or press `Cmd+Shift+Option+O`)

### "Missing compliance" when the build appears in TestFlight
- **Fix:** This is an export compliance question about encryption. Click on the build in App Store Connect, find the compliance question, and answer "No" (GranWatch uses standard HTTPS — it doesn't have custom encryption).

### Build stuck on "Resolving package graph" for more than 10 minutes
- **Fix:** Quit Xcode. Go to **Finder → Go → Go to Folder**, type `~/Library/Caches/org.swift.swiftpm/`, delete everything inside that folder. Then reopen Xcode.

---

## Quick Checklist

Before you click Archive, confirm:
- [ ] Package dependencies have finished loading (no spinner at the top)
- [ ] "Automatically manage signing" is checked
- [ ] Team is set to "Better Creation (Pty Ltd)"
- [ ] Bundle ID shows `app.granwatch`
- [ ] Push Notifications is in the capabilities list
- [ ] Associated Domains is in the capabilities list with `applinks:granwatch.app`
- [ ] Destination shows "Any iOS Device (arm64)" — NOT a simulator

---

*Last updated: June 2026*
