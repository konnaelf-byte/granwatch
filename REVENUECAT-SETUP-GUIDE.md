# RevenueCat Setup Guide for GranWatch

**Who this is for:** Konna (non-developer)
**Time needed:** ~1–2 hours
**What you'll end up with:** In-app subscriptions working on iOS (and ready for Android)

---

## Overview

You need to do these four things in this order:

1. Create the subscription product in **App Store Connect** first
2. Set up your **RevenueCat Dashboard** and connect everything
3. Set up a **webhook** so your Railway backend knows when someone subscribes
4. Add **environment variables** to Railway

---

## Part 1 — App Store Connect: Create the Subscription Product

> You must create the product in App Store Connect BEFORE you can attach it in RevenueCat.

### Step 1.1 — Go to App Store Connect

1. Open your browser and go to **https://appstoreconnect.apple.com**
2. Sign in with your Apple ID (the one associated with Better Creation Pty Ltd)
3. Click **"My Apps"** on the home screen
4. Click on your **GranWatch** app

### Step 1.2 — Create a Subscription Group

1. In the left sidebar, scroll down to **"Monetization"**
2. Click **"Subscriptions"** (under Monetization)
3. You'll see a page that says "Subscription Groups". Click the blue **"+"** button next to "Subscription Groups"
4. In the popup, type the group name: `Gran+`
5. Click **"Create"**

### Step 1.3 — Create the Subscription Product

1. Now you're inside the "Gran+" group. Click the blue **"+"** button to add a subscription
2. Fill in the form:
   - **Reference Name:** `Gran+ Monthly` (this is just for your own reference, not shown to users)
   - **Product ID:** `gran_plus_monthly` (type this exactly — it must match perfectly)
3. Click **"Create"**

### Step 1.4 — Configure the Subscription Details

You'll now be on the subscription's detail page. Fill in each section:

**Subscription Duration:**
- Click the dropdown and select **"1 Month"**

**Prices:**
1. Click **"Add Subscription Price"**
2. In the popup, find **"United States"** and set it to **$2.99**
3. Check the box **"Automatically generate prices for other regions"** — this saves you setting every currency manually
4. Click **"Next"** then **"Create"**

**Subscription Localization (what users see):**
1. Click **"Add Localization"**
2. Select **"English (U.S.)"**
3. Fill in:
   - **Subscription Display Name:** `Gran+ Monthly`
   - **Description:** `Full access to GranWatch — stay connected with the ones you love`
4. Click **"Save"**

**Review Information (needed for App Review):**
1. Scroll down to **"Review Information"**
2. **Screenshot:** Take a screenshot of what the paywall looks like in your app (you can do this from the simulator later — for now you can upload a placeholder and update it before submission)
3. **Review Notes:** Type something like: `This subscription unlocks premium features including unlimited family members and activity alerts.`
4. Click **"Save"**

> **Important:** Do NOT submit this for review yet. App Review happens later when you submit the full app build.

---

## Part 2 — RevenueCat Dashboard Setup

### Step 2.1 — Create a RevenueCat Account

1. Go to **https://app.revenuecat.com**
2. Click **"Sign Up"** and create a free account (use your email `konnaelf@icloud.com`)
3. Once logged in, you'll be on the Projects screen

### Step 2.2 — Create a New Project

1. Click **"+ Create a new project"**
2. Name it: `GranWatch`
3. Click **"Create"**

### Step 2.3 — Add Your iOS App

1. Inside your GranWatch project, click **"+ Add new app"**
2. Select **"App Store"** (for iOS)
3. Fill in:
   - **App name:** `GranWatch`
   - **Bundle ID:** `app.granwatch`
4. Click **"Add app"**

**Connect to App Store Connect:**
After adding the app, RevenueCat will prompt you to set up App Store Connect integration. This lets RevenueCat verify purchases automatically.

1. Click **"Connect to App Store Connect"**
2. You'll need an **App Store Connect API Key**. Here's how to get one:
   - Go back to App Store Connect in another tab
   - Click your name/avatar in the top-right corner → **"Users and Access"**
   - Click the **"Keys"** tab at the top
   - Click **"+"** to create a new key
   - Name: `RevenueCat`
   - Access: **"App Manager"**
   - Click **"Generate"**
   - Download the `.p8` key file (you can only download it once — save it somewhere safe)
   - Note the **Key ID** shown on the page (looks like `ABC123DEFG`)
   - Note the **Issuer ID** shown at the top of the page (looks like a UUID: `12345678-1234-...`)
3. Back in RevenueCat, fill in:
   - **Issuer ID:** paste your Issuer ID
   - **Key ID:** paste your Key ID
   - **Private Key (.p8 file):** click "Upload" and upload the `.p8` file you downloaded
4. Click **"Save"**

### Step 2.4 — Get Your iOS Public SDK Key

1. In RevenueCat, go to your GranWatch project
2. Click on your **iOS app** in the left sidebar
3. Click **"API Keys"** tab
4. You'll see a key starting with `appl_` — this is your **iOS Public SDK Key**
5. Copy it and save it somewhere — you'll need it later as `VITE_REVENUECAT_IOS_KEY`

### Step 2.5 — Add Your Android App

1. In your GranWatch project, click **"+ Add new app"**
2. Select **"Google Play"**
3. Fill in:
   - **App name:** `GranWatch`
   - **Package Name:** `app.granwatch`
4. Click **"Add app"**

> For now you don't need to connect Google Play — you can do that when you're ready to launch Android. Just adding the app gives you the SDK key.

**Get Your Android Public SDK Key:**
1. Click on your **Android app** in the left sidebar
2. Click **"API Keys"** tab
3. You'll see a key starting with `goog_` — this is your **Android Public SDK Key**
4. Copy it and save it somewhere — you'll need it later as `VITE_REVENUECAT_ANDROID_KEY`

### Step 2.6 — Get Your Secret API Key

This is used by your Railway backend to verify purchases server-side.

1. In RevenueCat, click **"Settings"** in the left sidebar (the gear icon at the bottom)
2. Click **"API Keys"**
3. You'll see a **"Secret API Keys"** section
4. Click **"+ Add new secret key"**
5. Name it: `Railway Backend`
6. Click **"Generate"**
7. Copy the key (starts with `sk_`) — save it as `REVENUECAT_SECRET_API_KEY`

> Keep this key secret — it goes in Railway, not in your app code.

### Step 2.7 — Create the Product in RevenueCat

1. In your GranWatch project, click **"Products"** in the left sidebar (under Monetization)
2. Click **"+ New product"**
3. Select your **iOS app** from the dropdown
4. Fill in:
   - **Product identifier:** `gran_plus_monthly`
   - **Type:** `Subscription`
   - **Duration:** `1 month`
5. Click **"Add product"**

### Step 2.8 — Create the Entitlement

An entitlement is what "unlocks" in your app when someone subscribes.

1. Click **"Entitlements"** in the left sidebar
2. Click **"+ New entitlement"**
3. Fill in:
   - **Identifier:** `gran_plus` (type this exactly)
   - **Description:** `Gran+ subscription features`
4. Click **"Add entitlement"**

**Attach the product to the entitlement:**
1. Click on the `gran_plus` entitlement you just created
2. Click **"Attach"**
3. Select your iOS app and the `gran_plus_monthly` product
4. Click **"Attach"**

### Step 2.9 — Create the Offering

An offering is what RevenueCat shows your app when it asks "what subscription options are available?"

1. Click **"Offerings"** in the left sidebar
2. Click **"+ New offering"**
3. Fill in:
   - **Identifier:** `default` (type this exactly — your app code looks for this)
   - **Description:** `Default offering`
4. Click **"Add offering"**

**Add a Package to the Offering:**
1. Click on the `default` offering you just created
2. Click **"+ Add package"**
3. Fill in:
   - **Identifier:** `$rc_monthly` (this is RevenueCat's built-in monthly identifier)
4. Click **"Add package"**
5. Click on the package you just added
6. Click **"Attach"** and select your `gran_plus_monthly` product
7. Click **"Attach"**

---

## Part 3 — Webhook Setup

The webhook tells your Railway backend in real-time when someone subscribes, renews, or cancels — so your database stays in sync.

### Step 3.1 — Create the Webhook Auth Header Value

You need to create a random secret string. Here's how:

1. Go to **https://www.uuidgenerator.net**
2. Click **"Generate"** to get a random UUID
3. Copy the result (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. This will be your `REVENUECAT_WEBHOOK_AUTH_HEADER` value — save it

### Step 3.2 — Add the Webhook in RevenueCat

1. In RevenueCat, click **"Integrations"** in the left sidebar
2. Click **"Webhooks"**
3. Click **"+ Add webhook"**
4. Fill in:
   - **Webhook URL:** `https://granwatch-production.up.railway.app/api/revenuecat/webhook`
   - **Authorization header:** paste the random UUID you created in Step 3.1
5. Click **"Add webhook"**

RevenueCat will send a test event. If it shows a green checkmark, the connection is working.

---

## Part 4 — Add Environment Variables to Railway

Now you'll add all the secrets to Railway so your backend can use them.

### Step 4.1 — Go to Railway

1. Go to **https://railway.app** and sign in
2. Click on your **GranWatch** project
3. Click on the **granwatch service** (your main app)
4. Click the **"Variables"** tab

### Step 4.2 — Add the Variables

Click **"+ New Variable"** for each of the following:

| Variable Name | Value | Where you got it |
|---|---|---|
| `REVENUECAT_SECRET_API_KEY` | `sk_...` | RevenueCat → Settings → API Keys → Secret key |
| `REVENUECAT_WEBHOOK_AUTH_HEADER` | Your UUID from Step 3.1 | You created this |
| `VITE_REVENUECAT_IOS_KEY` | `appl_...` | RevenueCat → iOS app → API Keys |
| `VITE_REVENUECAT_ANDROID_KEY` | `goog_...` | RevenueCat → Android app → API Keys |

After adding all four, Railway will automatically redeploy your service. Wait for the deploy to finish (the status indicator turns green).

---

## Part 5 — Final Verification with TestFlight

Once you have a build on TestFlight (see `XCODE-BUILD-GUIDE.md`), test the subscription flow:

### Step 5.1 — Create a Sandbox Account

Apple sandbox accounts let you test subscriptions without being charged.

1. Go to **App Store Connect → Users and Access → Sandbox**
2. Click **"+"** to create a tester
3. Use a fake email like `konna+sandbox1@icloud.com` (Gmail also works with the `+`)
4. Fill in the required fields and click **"Create"**

### Step 5.2 — Test on Your iPhone

1. On your iPhone, go to **Settings → App Store**
2. Scroll down and sign out of your regular Apple ID under "SANDBOX ACCOUNT" area
   - Actually, DO NOT sign out of your main Apple ID — iOS handles sandbox separately
3. Open your TestFlight app and install the GranWatch build
4. Open GranWatch and go to the upgrade/paywall screen
5. Tap to subscribe — when the payment sheet appears, it will say **"SANDBOX ENVIRONMENT"**
6. Sign in with your sandbox account when prompted
7. Complete the "purchase" (no real money is charged)

### Step 5.3 — Verify in RevenueCat

1. In RevenueCat Dashboard, click **"Customers"** in the left sidebar
2. Search for the sandbox email you used
3. You should see the customer with an active `gran_plus` entitlement
4. Click on the customer to see the purchase details

If the customer shows up with the entitlement active, everything is working correctly.

---

## Quick Reference — Keys Checklist

Before you move on, confirm you have all of these saved:

- [ ] `VITE_REVENUECAT_IOS_KEY` — starts with `appl_`
- [ ] `VITE_REVENUECAT_ANDROID_KEY` — starts with `goog_`
- [ ] `REVENUECAT_SECRET_API_KEY` — starts with `sk_`
- [ ] `REVENUECAT_WEBHOOK_AUTH_HEADER` — your UUID
- [ ] App Store Connect API Key `.p8` file — saved in a safe place
- [ ] App Store Connect Issuer ID and Key ID — noted somewhere

---

*Last updated: June 2026*
