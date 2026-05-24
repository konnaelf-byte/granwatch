# GranWatch — Action Plan
*Your Head of Ops · Updated 24 May 2026*

---

## The Grand Goal
Become the world's first family eldercare coordination network — used by families in every country. Not just a reminder app. The same product, positioned differently, can be worth 10× more.

**Valuation path:**
| Milestone | ARR | Multiple | Valuation |
|-----------|-----|----------|-----------|
| Consumer only, 10K families | $600K | 5× | $3M |
| Consumer + B2B, 50K families | $3M | 10× | $30M |
| With government/NHS contract | $5M | 15× | $75M |
| Full platform + institutional | $10M | 20× | $200M |

---

## CATEGORY 1 — What Your Head of Ops Can Do

These are things I can build, write, or configure directly in the codebase. Just say the word.

### App Store Readiness
- [x] **Privacy Policy page** — live at granwatch.app/privacy ✅
- [x] **Terms of Service page** — live at granwatch.app/terms ✅
- [x] **Account deletion flow** — Apple requirement, built and deployed ✅
- [x] **App icon 1024×1024** — correct logo in place ✅
- [ ] **Capacitor config files** — `capacitor.config.ts`, `Info.plist` permission strings, `AndroidManifest.xml` permissions. I can scaffold the full config; a developer then runs it on a Mac with Xcode installed.
- [ ] **Deep linking config** — `apple-app-site-association` file (iOS universal links) and `assetlinks.json` (Android) so `granwatch.app/join/CODE` opens the native app.
- [ ] **App Store metadata** — write the full long description (4000 chars), short description (30 chars for Play Store), keywords (100 chars), "What's New" copy, and all 5 screenshot title overlays.
- [ ] **Age rating questionnaire answers** — prepare the answers for both Apple and Google (GranWatch rates 4+ / Everyone — no violence, no adult content).
- [ ] **Offline support** — service worker upgrade to cache visit history and queue visit logs when offline. Improves App Store ratings significantly.
- [ ] **Sentry error tracking** — install and configure so you know about crashes before App Store reviewers do.
- [ ] **Accessibility pass** — ensure text uses relative units (Dynamic Type for iOS), add VoiceOver labels to interactive elements.

### Pricing & Growth Infrastructure
- [ ] **Location-based pricing code** — once you create the 7 regional Lemon Squeezy variants, I write the `utils/geolocation.ts` (ipapi.co lookup) and wire it into `GranPlusModal.tsx` so users see local prices automatically.
- [ ] **Referral program backend** — generate referral codes, track who invited whom, auto-apply 1-month free when a referral converts. Full backend + frontend.
- [ ] **Multilingual i18n scaffold** — set up the translation framework (react-i18next) and extract all strings, ready for a translator to fill in Tagalog and Spanish.
- [ ] **Care Coordinator dashboard** — the B2B2C professional view where a social worker can see visit status of referred families (aggregated, not individual data) and send referral links in one click.
- [ ] **Push notification backend** — store push tokens per user, trigger push on the same events that currently send emails (14-day nudge, 21-day alert, birthday). Pairs with the Capacitor push plugin.
- [ ] **Landing page dynamic pricing** — replace the hardcoded "R79/month" with the user's local currency once geolocation is in.
- [ ] **SEO improvements** — add JSON-LD structured data, meta descriptions, og:image to the landing page to improve organic search ranking.

### Ongoing Ops
- [x] **Weekly status cron** — runs every Monday 9am, checks app health, commits, blockers, and gives 3 growth suggestions ✅

---

## CATEGORY 2 — What You (Konna) Need to Cover

These require your personal login, identity, payment, or direct human relationship.

### Accounts & Payments (one-time setup)
- [ ] **Apple Developer Account** — sign up at developer.apple.com, $99/year. You need this before any iOS submission, TestFlight, or APNs push certificates. Takes 24–48 hours to activate.
- [ ] **Google Play Console Account** — sign up at play.google.com/console, $25 one-time. Faster to activate than Apple.
- [ ] **Apple Small Business Program** — apply at developer.apple.com/app-store/small-business-program/ after you have a Developer Account. Reduces Apple's cut from 30% to 15% (you qualify under $1M revenue).

### Credentials Still Missing
- [ ] **Resend DNS records** — log into Cloudflare, add the 3 DNS records Resend gives you for `noreply@granwatch.app`. Until this is done, all email notifications are broken.
- [ ] **Lemon Squeezy KYC** — complete identity verification in your LS dashboard so payouts are enabled.
- [ ] **Clerk production keys** — flip from `pk_test_` / `sk_test_` to production keys in your Clerk dashboard, update in Railway environment variables.
- [ ] **OWNER_CLERK_ID** — set this in Railway env vars after your first login on the production app (identifies your account as the super-admin).
- [ ] **7 regional Lemon Squeezy pricing variants** — create these in your LS dashboard (ZAR R79, USD $4.99, GBP £3.99, EUR €4.49, BRL R$14.99, INR ₹149, LOW $2.99). Once done, I wire them up in the code immediately.

### App Store Submission
- [ ] **Take app screenshots** — run the live app and take screenshots at iPhone 15 Pro Max size (6.7") and iPhone 8 Plus size (5.5"). Min 3 per size. I'll give you exact dimensions and a shot list when ready.
- [ ] **Submit to App Store Connect** — fill in the App Store listing (I write all the copy, you paste and submit).
- [ ] **Submit to Google Play Console** — same: I write everything, you submit.
- [ ] **TestFlight beta** — invite 10–20 real users to test for 1–2 weeks before submitting for review. Start with friends and family.

### Growth (Human Relationships Required)
- [ ] **Contact 3 local social workers or community nurses** — pitch GranWatch as a free tool they can recommend to families of their clients. One yes = your first B2B2C pilot and a case study. One phone call or email is all it takes.
- [ ] **Post in 3 diaspora Facebook groups** — SA expats in UK/AU, or Filipino OFW groups. Test the diaspora hypothesis cheaply before any paid ads. Personal accounts perform far better than brand accounts.
- [ ] **Collect 5 written testimonials** — ask your earliest real users for a sentence or two. Put them on the landing page and in the App Store listing. Social proof is your highest-converting marketing asset.
- [ ] **Pitch one journalist** — "South African app makes sure Gran is never forgotten." Family / parenting journalists love this angle. One article = thousands of visitors. Costs one email.

---

## CATEGORY 3 — What Needs Outside Help

These require skills, tools, or access that neither of us can handle alone.

### Developer (2-week contract, ~$1,500–3,000)
**This is the single most important hire.** Everything else for the App Store is done or ready. This is the only remaining blocker.

A mobile developer with Xcode + Android Studio can:
- **Build the Capacitor native wrapper** — turns the web app into a real iOS/Android app. Takes 1–2 days.
- **Configure APNs certificates** — requires Apple Developer portal + Xcode. Enables native push on iOS.
- **Set up Firebase/FCM** — enables native push on Android.
- **Sign and submit the builds** — iOS signing via Xcode, Android via Android Studio.
- **Run TestFlight beta** — distribute to testers before App Store review.

*Find on: Upwork (search "Capacitor iOS Android"), South African dev communities, or ask for a referral from another founder.*

### Designer (optional but high-impact)
- **App Store screenshots** — professional mockup screens (phone frame + marketing overlay) improve conversion dramatically. Tools like Previewed.app let a designer produce these in a day. Cost: $100–500.
- **App preview video** — a 15–30 second clip showing the app in action. Not required, but Apple reports videos increase downloads by 25%+. Cost: $200–800.

### Translators (Phase 2 priority)
- **Tagalog translator** — Filipino diaspora is the single biggest growth opportunity. 10M+ overseas Filipino workers who worry about parents back home. One good translation unlocks that market.
- **Spanish translator** — 500M speakers. Covers Mexican diaspora in the US, all of Latin America, Spain.

*Upwork or community translation services work well. Budget ~$200–500 per language for a full app translation.*

### PR / Media (Phase 2)
- A PR contact for sustained press coverage. The first pitch you can do yourself — it's a great story. Once you have traction, a PR person amplifies it to bigger publications.

---

## Your Right-Now Priority List

| # | Who | Action |
|---|-----|--------|
| 1 | **Konna** | Add Resend DNS records to Cloudflare — email is broken without this |
| 2 | **Konna** | Sign up for Apple Developer Account ($99) and Google Play Console ($25) |
| 3 | **Konna** | Create 7 regional Lemon Squeezy pricing variants |
| 4 | **Me** | Wire up location-based pricing code (once #3 is done) |
| 5 | **Outside** | Hire a developer for 2 weeks — Capacitor wrapper + App Store submission |
| 6 | **Konna** | Contact 3 local social workers about B2B2C pilot |
| 7 | **Me** | Build referral program backend |
| 8 | **Konna** | Collect 5 testimonials from real users |
| 9 | **Me** | Write full App Store metadata (descriptions, keywords, copy) |
| 10 | **Outside** | Tagalog translator — biggest single growth unlock after app stores |

---

## The 5-Phase Strategy

| Phase | Timeline | Goal | Revenue Target |
|-------|----------|------|----------------|
| 1 — PMF Sprint | Now – Month 6 | 500 paying families | $2,200 USD MRR |
| 2 — Geographic Expansion | Months 4–18 | 5,000 families, diaspora markets | $15,000 USD MRR |
| 3 — B2B2C Layer | Months 12–30 | First institutional client | $50,000 USD MRR |
| 4 — Data & Institutional | Months 24–48 | $1M+ ARR, acquisition-ready | $100,000+ USD MRR |
| 5 — Exit | Years 3–5 | Maximum net worth realisation | $30M–$200M valuation |

**Biggest single opportunity in Phase 2:** Filipino diaspora — 10M+ overseas Filipino workers who send money home and worry about parents left behind. One targeted Facebook ad in Tagalog + an app in their language = your fastest path to 10,000 users.

**Likely acquirers when ready:** Care.com, Bupa/AXA/Discovery Health, AARP, Teladoc, or a home care chain wanting a digital coordination layer.

---

*GranWatch has what most startups don't: a real problem, genuine emotional resonance, and no meaningful competitor at this positioning. The ceiling is very high.*

*— Your Head of Ops*
