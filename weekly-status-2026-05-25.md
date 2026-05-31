---
**GranWatch Weekly Status — 25 May 2026**

**🟢 App Health:** granwatch.app loads cleanly (HTTP 200, correct title/meta). /privacy and /terms both respond — client-side routes confirmed live (added 23 May).

**📝 Recent Commits:**
- 2026-05-24 — `docs: restructure strategy into 3 action categories (me / Konna / outside help)`
- 2026-05-24 — `chore: update PWA icons to new GranWatch logo (dark green)`
- 2026-05-24 — `chore: replace PWA icons with updated GranWatch logo`
- 2026-05-23 — `feat: add Privacy Policy + Terms pages, account deletion (Apple requirement), fix granwatch.com refs`
- 2026-05-23 — `chore: replace PWA icons with correct GranWatch logo (cream/open-arc)`

**🔑 Outstanding Blockers:**
- **Resend DNS / noreply@granwatch.app** — No commits referencing Resend. Email likely still broken.
- **Lemon Squeezy KYC** — No signal of completion. Payouts and subscriptions remain blocked.
- **Clerk production keys** — No commit switching from pk_test_ → pk_live_. App is still in test-auth mode.
- **Apple Developer Account ($99)** — No evidence of purchase in commits. Required before Capacitor build can target TestFlight.
- **Google Play Console ($25)** — Same — no signal.
- **Location-based pricing variants** — 7 regional Lemon Squeezy variants not yet created (ZAR, USD, GBP, EUR, BRL, INR, LOW).

**📱 App Store Readiness: 4/10 items done**
Done ✅: Privacy Policy, Terms of Service, Account deletion flow, App icon 1024x1024
Next up: Capacitor native wrapper → Apple IAP → Push notifications → Screenshots → Metadata → TestFlight

**🚀 This Week's 3 Growth Actions:**

1. **Start the Capacitor wrapper this week.** Run `npx cap init` and `npx cap add ios`, confirm the web layer loads in Xcode simulator. This is the single longest-lead item before App Store submission — every week it slips costs a week of potential downloads. Pair it with purchasing the Apple Developer Account ($99) so you can actually deploy to TestFlight.

2. **Post in 3 diaspora Facebook groups.** Target SA diaspora in UK (e.g. "South Africans in London", "SA Mums in the UK") with a personal story post — no hard sell, just "I built this because I live far from my gran." Aim for 50 sign-ups this week from organic shares. Screenshot the comments for future social proof.

3. **Switch Clerk to production keys and verify Resend DNS.** These two together mean real users can actually sign up and receive alerts. Until both are live, no amount of marketing matters — new users hit a broken auth or silent email flow. Block 2 hours this week to tick both off the Resend and Clerk dashboards.

**📋 Single Most Important Action This Week:** Purchase the $99 Apple Developer Account and initialise the Capacitor iOS wrapper — without these, App Store launch stays hypothetical no matter how polished the web app gets.

---
*— Your Head of Ops*
