# GranWatch — Pre-Release Device Checklist
*Run this ONCE on a real iPhone + a real Android phone before any marketing push or store submission. ~10 minutes per device. Born from the Aug 2026 birthday-picker saga: compiler-clean code can still fail on a device, and iOS and Android fail differently.*

## ⚠️ First: get the fresh build on the device
The app shell caches aggressively (service worker, stale-while-revalidate). After any web deploy:
**open the app → swipe it fully closed → open it AGAIN.** Only the second launch is guaranteed to run the new code.

## Core flow (both platforms)
1. Sign in with Google — completes, lands on dashboard
2. Sign in with email code — code arrives, completes
3. Create a gran: name, **birthday (set a 1940s year!)**, country, threshold → profile created
4. Upload a photo (large photo from camera roll) → crop → avatar appears
5. Log a visit with a photo + mood → ring turns green, celebration push arrives on other member's phone
6. Invite link: copy, open on the OTHER device → joins the family (iOS: link should open the APP, not browser, from build 13+)
7. Notifications page: mark all read → in-app list clears AND the app-icon badge clears (iOS)
8. Gran+ modal opens: shows price (or trial-countdown fallback), no raw error text anywhere
9. Elder settings: change birthday, change threshold, save → sticks after reload

## iOS-specific
- Widget on home screen shows rings + photos; updates after logging a visit
- Push notification arrives with the app closed
- App icon badge shows a number on push, clears on app open

## Android-specific
- Push notification arrives with the app closed
- Back button behaves (doesn't exit app mid-flow)
- Photo upload via camera AND via gallery

## Rules of thumb
- Any dropdown/picker/date control: test on iOS specifically — iOS WebKit eats interactions that work everywhere else. Prefer OS-native controls (`<input type="date">`) on iOS.
- Anything with 3D transforms / preserve-3d: verify taps still work on elements BELOW it on the page (iOS hit-testing bugs).
- After changing push/notification code: verify badge count AND clearing, not just arrival.
