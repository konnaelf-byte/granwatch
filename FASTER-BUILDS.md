# GranWatch — Faster build & test workflows
*Researched 2026-06-24. The goal: stop doing the slow Xcode-GUI archive dance for every change.*

## The big realization first: most changes need NO build at all
GranWatch's native app loads its UI **live** from `https://granwatch.app` (`capacitor.config.json` → `server.url`). That means:

- **Web/JS/server changes (the vast majority) deploy with a `git push`** → Railway rebuilds → the installed app picks them up on next launch. No TestFlight build, no Xcode. This is what we've been doing all day (renames, mood picker, Care gating, birthday fix, security fixes — all shipped with zero rebuilds).
- **You only need a real native build when you change:** `capacitor.config.json`, native plugins, `Info.plist`/entitlements, the widget, app icon, or the build number for submission.

So rule #1: **lean on live deploys.** Reserve native builds for genuinely native changes.

## Rule #2: for the rare native build, use fastlane (one command, no GUI)
Today's Build 7 meant me driving Xcode's GUI by screen control (slow, fragile). Fastlane replaces that with a single command I can run for you via Desktop Commander — no GUI, no clicking, and (critically) **no 2FA prompts**, because it authenticates with an App Store Connect API key instead of your Apple ID.

### One-time setup (you, ~3 minutes — only the API key needs your login)
1. App Store Connect → **Users and Access → Integrations → App Store Connect API → Keys** → generate a key with **App Manager** role.
2. **Download the `.p8` file immediately** (only downloadable once). Note the **Key ID** and **Issuer ID**.
3. Put the `.p8` somewhere stable, e.g. `~/.appstoreconnect/AuthKey_XXXX.p8`.
4. Tell me the Key ID + Issuer ID + path (the .p8 is not a password — it's an API credential; still, you can place it yourself and just give me the path).
5. One-time install on the Mac: `brew install fastlane` (or it ships with Xcode's Ruby — I can handle this via Desktop Commander).

I've scaffolded the config (see `fastlane/Fastfile` and `fastlane/Appfile` in the repo). After the key exists, the whole build→TestFlight flow becomes:

```
pnpm run cap:build        # vite build + cap sync (web → native)
fastlane beta             # bump build #, build, sign, upload to TestFlight
```

…and I can run both for you through Desktop Commander. No Xcode window.

> Signing note: the project currently uses **manual** signing with named distribution profiles ("GranWatch Distribution" + "GranWatch Widget Distribution"). The Fastfile is set up for app-store export; the first `fastlane beta` run may need a one-time signing confirmation or a switch to automatic signing — I'll sort that on the first run.

## Rule #3: test on TestFlight's internal track (instant, no review)
- Add yourself (and family testers) to an **Internal Testing** group in TestFlight. Internal builds are available **within minutes of processing, with no App Review**. You're already using this.
- External testing needs a quick Beta App Review — only relevant when you invite people outside your team.

## Rule #4: in-app purchase testing — Sandbox, no build needed
- Once RevenueCat keys are set (next session), Gran+ sandbox testing happens **on the Build 7 you already have** (the JS that drives RevenueCat loads live). Create a **Sandbox Apple Account** (ASC → Users and Access → Sandbox), sign into it on the iPhone under Settings → Developer/App Store → Sandbox Account, and test the purchase. No new build.

## Alternative considered: Xcode Cloud
Apple's built-in CI can auto-build + push to TestFlight on every git push (no local machine needed at all). It's the most "hands-off" option long-term, but setup lives in Xcode/ASC and it bills by compute minutes. **Recommendation: start with fastlane** (simpler, free, runs on your Mac which is already set up). Move to Xcode Cloud later if you want builds to happen without the Mac on.

## TL;DR recommendation
1. Keep shipping web/server changes via `git push` (no build) — this already covers ~90% of work.
2. Generate the App Store Connect API key once → then native builds are `fastlane beta`, runnable headless via Desktop Commander.
3. Test on the TestFlight internal track (minutes, no review).
4. IAP via Sandbox account on the existing build.

Sources: fastlane docs (upload_to_testflight, App Store Connect API), Capgo Capacitor CI guides.
