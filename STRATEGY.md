# GranWatch — Action Plan
*Your Head of Ops · Updated 17 June 2026*

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

## Post-MVP Roadmap

Features locked in for after the native app ships. Not blocking launch — logged here so nothing gets forgotten.

### 🟣 iOS Home Screen Widget *(post-MVP, high impact)*

**Concept:** Identical layout to Apple's native battery status widget — a grid of circular ring indicators, one per gran profile. Where Apple shows a phone/watch icon inside each ring, GranWatch shows the **gran's profile photo**. The arc of the ring fills or drains to show her visit status at a glance, exactly as you'd check a device battery.

A family member puts this on their home screen and knows — before they even open the app — whether Gran is doing fine or needs attention.

**Ring behaviour:**

| Ring fill | Status | Meaning |
|-----------|--------|---------|
| Full green arc | 🟢 Green | Gran visited recently — all good |
| ~60% yellow arc | 🟡 Yellow | Getting close to threshold — someone should visit soon |
| ~30% orange arc | 🟠 Orange | Overdue — nudge is due |
| Empty / red arc | 🔴 Red | Alert threshold reached — family needs to act |

This maps directly onto the existing `elder.status` field (`green / yellow / orange / red`) and `elder.daysSinceVisit` — no new data model needed. The ring fill percentage = `1 - (daysSinceVisit / alertThresholdDays)`, clamped to [0, 1].

**Dynamic ring count:**

The number of rings shown is determined automatically by how many gran profiles the user belongs to as a family member — exactly the same way Apple's battery widget populates itself based on however many devices are paired. No manual configuration needed.

- 1 gran → 1 ring (centred, large)
- 2 grans → 2 rings side by side
- 3 grans → 3 rings in a row (matches the Apple battery medium widget at full capacity)
- 4–6 grans → 2-row grid

If a user is a family member of 3 different grans (e.g. their own mum, their partner's gran, and an aunt), all three rings populate the widget automatically on install. Adding a new gran profile via the app triggers a widget timeline reload and the new ring appears.

**Widget sizes to support:**

- **Small** (2×2): shows up to 1 ring. For users monitoring a single gran — the ring fills the tile with the photo and arc prominent.
- **Medium** (4×2): shows up to 3 rings in a row. Primary target — matches the Apple battery widget layout exactly. If the user has fewer than 3 grans, the occupied slots fill left-to-right and remaining slots are empty (or hidden, matching Apple's behaviour).
- **Large** (4×4): shows up to 6 rings in a 2×3 grid. For users in multiple families or managing several elder profiles.

**Why it matters:**

This is a daily-driver feature in the truest sense — the widget lives on the home screen permanently. It removes the activation energy of opening the app. A user who might check the app once a week will glance at the widget every time they unlock their phone. That turns passive retention into active habit. It's also a word-of-mouth hook: "what's that widget on your home screen?" is a natural conversation starter.

It's also a genuine App Store differentiator. No eldercare or family coordination app has shipped a status-ring widget. It's novel, it's glanceable, and it's emotionally resonant in a way that a plain icon could never be.

**Tech path:**

1. **WidgetKit extension** (Swift, separate target in Xcode) — required for iOS home screen widgets; cannot be done in Capacitor/JS, must be native Swift.
2. **App Groups** — shared UserDefaults/file container between the Capacitor app and the WidgetKit extension. The main app writes elder status data here on every fetch; the widget reads from it.
3. **Data format in shared container** — JSON array of elder summaries: `[{ id, name, photoUrl, status, daysSinceVisit, alertThresholdDays }]`. Lightweight, no DB access from widget.
4. **SwiftUI widget view** — circular `Circle()` with `trim(from:to:)` modifier for the arc, `AsyncImage` or cached `UIImage` for the gran photo, status colour from the existing palette.
5. **Timeline provider** — widget refreshes every 15–60 minutes via `TimelineProvider`. No real-time needed; visit status changes slowly by design.
6. **Tapthrough** — tapping a gran in the widget deep-links to `/elder/:id` in the app via URL scheme (`granwatch://elder/123`).

**Prerequisites:** Native Capacitor app must be live first (the WidgetKit extension is added to the same Xcode project). Estimated dev effort: **3–5 days** for a developer who knows WidgetKit. Can be shipped as a 1.1 or 1.2 App Store update after the initial launch.

**Android note:** Android home screen widgets use a different API (AppWidgetProvider). The same concept works on Android but requires separate implementation. Recommend iOS first since WidgetKit is more polished and the iOS audience is more widget-engaged.

---

## CATEGORY 1 — What Your Head of Ops Can Do

These are things I can build, write, or configure directly in the codebase. Just say the word.

### App Store Readiness
- [x] **Privacy Policy page** — live at granwatch.app/privacy ✅
- [x] **Terms of Service page** — live at granwatch.app/terms ✅
- [x] **Account deletion flow** — Apple requirement, built and deployed ✅
- [x] **App icon 1024×1024** — correct logo in place ✅
- [x] **Capacitor config files** — `capacitor.config.ts`, `Info.plist` permission strings, `AndroidManifest.xml` committed ✅
- [ ] **Deep linking config** — `apple-app-site-association` file (iOS universal links) and `assetlinks.json` (Android) so `granwatch.app/join/CODE` opens the native app.
- [x] **App Store metadata** — full long description, keywords, screenshot titles all written ✅
- [x] **App Store Connect guide** — `APP-STORE-CONNECT-GUIDE.md` committed; developer can follow step-by-step ✅
- [ ] **Age rating questionnaire answers** — prepare the answers for both Apple and Google (GranWatch rates 4+ / Everyone — no violence, no adult content).
- [ ] **Offline support** — service worker upgrade to cache visit history and queue visit logs when offline. Improves App Store ratings significantly.
- [ ] **Sentry error tracking** — install and configure so you know about crashes before App Store reviewers do.
- [ ] **Accessibility pass** — ensure text uses relative units (Dynamic Type for iOS), add VoiceOver labels to interactive elements.

### Pricing & Growth Infrastructure
- [ ] **Location-based pricing code** — once you create the 7 regional Lemon Squeezy variants, I write the `utils/geolocation.ts` (ipapi.co lookup) and wire it into `GranPlusModal.tsx` so users see local prices automatically.
- [x] **Referral program backend** — referral codes, tracking, 1-month free on conversion. Full backend + frontend. ✅
- [ ] **Multilingual i18n scaffold** — set up the translation framework (react-i18next) and extract all strings, ready for a translator to fill in Tagalog and Spanish.
- [ ] **Care Coordinator dashboard** — the B2B2C professional view where a social worker can see visit status of referred families (aggregated, not individual data) and send referral links in one click.
- [x] **Push notification backend** — FCM via Firebase Admin SDK; pushTokens table; register/unregister tRPC endpoints; nightly cron fires push alongside in-app + email. ✅ *Note: Konna must add FIREBASE_SERVICE_ACCOUNT_JSON to Railway env vars to activate.*
- [ ] **Landing page dynamic pricing** — replace the hardcoded "R79/month" with the user's local currency once geolocation is in.
- [x] **SEO improvements** — JSON-LD structured data, meta descriptions, og:image on landing page. ✅

### Ongoing Ops
- [x] **Weekly status cron** — runs every Monday 9am, checks app health, commits, blockers, and gives 3 growth suggestions ✅

---

## CATEGORY 2 — What You (Konna) Need to Cover

These require your personal login, identity, payment, or direct human relationship.

### Accounts & Payments (one-time setup)
- [x] **Apple Developer Account** — ✅ APPROVED as Better Creation (Pty Ltd) — activated ~1 June 2026. $99/year paid.
- [ ] **Google Play Console Account** — sign up at play.google.com/console, $25 one-time. Faster to activate than Apple.
- [ ] **Apple Small Business Program** — apply at developer.apple.com/app-store/small-business-program/ after you have a Developer Account. Reduces Apple's cut from 30% to 15% (you qualify under $1M revenue).

### Credentials Still Missing
- [x] **Resend DNS records** — DKIM/SPF/DMARC live ✅
- [ ] **Lemon Squeezy KYC** — complete identity verification in your LS dashboard so payouts are enabled.
- [ ] **FIREBASE_SERVICE_ACCOUNT_JSON** — add to Railway env vars to activate native push notifications. Firebase Console → Project Settings → Service Accounts → Generate new private key → paste JSON as single-line string.
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

## Australia — First International Market

### Why Australia First

Australia is the natural first international market for GranWatch:

- **South African diaspora** — one of the largest SA communities outside Africa lives in Sydney, Melbourne, and Perth. They already have WhatsApp groups, Facebook groups, and community networks. Trust travels with them — an app built by a South African, solving a problem they feel acutely (family far away), starts with built-in credibility.
- **High English literacy** — no localisation required. The existing English app ships as-is.
- **Smartphone penetration** — 91%+ smartphone ownership. iOS is strong in AU (roughly 55% market share vs Android 45%), which aligns with our App Store priority.
- **Strong eldercare sector** — Australia has a mature, government-funded aged care system (My Aged Care), a large professional care workforce, and high public awareness of elder wellbeing. GranWatch fits naturally into the family coordination layer alongside formal care services.
- **AUD is strong** — AUD $4.99 is an easy price point. It feels cheap to Australians but represents real revenue.

### Target AUD Price

**Gran+ at AUD $4.99/month.**

This is approximately ZAR R55–65 at direct exchange, but in purchasing-power terms it's a slight discount from USD $2.99 — deliberately so, to drive early adoption in a new market. It still nets ~AUD $3.49 after Apple/Google cut (70%), which is roughly USD $2.30 — very close to the USD net per subscriber.

**Add this variant to Lemon Squeezy (web checkout fallback):**

| Region | LS Variant | Price |
|--------|-----------|-------|
| South Africa | `LS_VARIANT_ID_ZAR` | ZAR R79 |
| United States | `LS_VARIANT_ID_USD` | USD $4.99 |
| United Kingdom | `LS_VARIANT_ID_GBP` | GBP £3.99 |
| Euro zone | `LS_VARIANT_ID_EUR` | EUR €4.49 |
| Brazil | `LS_VARIANT_ID_BRL` | BRL R$14.99 |
| India | `LS_VARIANT_ID_INR` | INR ₹149 |
| Low-income / fallback | `LS_VARIANT_ID_LOW` | USD $2.99 |
| **Australia** | **`LS_VARIANT_ID_AUD`** | **AUD $4.99** |

### Key Demographics to Target in Australia

1. **South African expats in Sydney, Melbourne, Perth** — large, tight-knit communities active on WhatsApp and Facebook (groups like "South Africans in Australia", "SA Expats Sydney", "Perth SA Braai & Social"). Their parents are in SA. They feel guilt and anxiety about not being nearby. GranWatch is the product they didn't know existed. Reach them for free through these communities before spending a cent on ads.

2. **Adult children aged 35–55 with ageing parents** — whether parents are in SA, Australia, or elsewhere. This is the universal use case: child moved away, parent is getting older, nobody is tracking whether Gran has been visited lately. In Australia, rural families (parents in outback Queensland or WA, kids in the city) feel this acutely.

3. **Filipino OFW community in Australia** — Australia has one of the largest Filipino communities outside the Philippines (~400,000+). OFWs send money home and worry about parents left in the Philippines. GranWatch speaks to exactly that anxiety. This community is highly active on Facebook. A Spanish-equivalent opportunity but in Australia, now, with no extra localisation needed (English suffices to start).

4. **Australian families with ageing parents in rural or remote areas** — a domestic AU use case entirely independent of diaspora. Families who visit parents in country towns, regional hospitals, or aged care facilities. The care gap between city kids and country parents is a known Australian social issue with coverage in mainstream media.

### First 3 Marketing Moves for Australia

**1. Post in SA expat Facebook groups in AU (free, zero ad spend, high-trust)**
Search Facebook for: "South Africans in Australia", "South Africans in Sydney", "South Africans in Melbourne", "South Africans in Perth", "SA Expats Australia". Most groups allow introductory posts from members. Join as yourself (Konstand), introduce GranWatch honestly — "I built this because I know what it feels like to have family far away." Personal story + product link. One post per group. Do not use a brand account. High-trust communities respond to authentic founder posts, not marketing.

**2. Approach a South African social worker or aged care organisation in AU for a referral partnership**
There are South African-run community organisations and social workers in AU who support the SA diaspora. A referral partnership — where a care professional recommends GranWatch to the families they work with — is your highest-quality acquisition channel. It's free, it's trusted, and it produces users who are genuinely engaged. Search LinkedIn for "South African social worker Australia" or contact bodies like the South African Chamber of Commerce in Australia (SACCA). One meeting is all it takes.

**3. Pitch a South African or diaspora-focused Australian journalist**
Angle: *"South African founder builds app to make sure Gran is never forgotten — expats in Australia are using it to keep watch on parents back home."* This hits multiple editorial buckets: tech startup story, diaspora/community story, eldercare story, mental health story (family guilt). Target: Bhekiwe Mathondo (Bhekiwe is a placeholder — find the SA-focused reporter at ABC or a community publication like the Australian SA community newsletter). Cost: one personalised email. One article in a diaspora publication or mainstream AU outlet = hundreds of organic installs.

### AU Partnership Counter-Proposal

The AU contact proposed 50% of profits as their fee for representing GranWatch in Australia. Counter-proposal:

**Offer: Non-exclusive 30% of net AU revenue, 12-month initial term, renewable.**

- **30% of net AU revenue** — "net" means after Apple/Google's 30% platform cut. So on an AUD $4.99/month subscriber, Apple takes ~$1.50, leaving ~$3.49. The AU partner receives 30% of that: ~AUD $1.05/subscriber/month. At 100 paying AU subscribers that's ~AUD $105/month passive income for the partner. Scalable.
- **Non-exclusive** — GranWatch retains the right to grow AU through other channels (ads, press, organic). The partner is not the only path to AU revenue.
- **12-month initial term, renewable** — both parties review at the 12-month mark. If it's working, renew. If not, either party can walk away cleanly.
- **Performance clause** — to retain any exclusivity rights (if ever granted), the partner must reach a minimum of 100 paying AU subscribers within year 1. Below that threshold, exclusivity lapses automatically. This protects you from a partner who takes 30% but does nothing.
- **What the partner gets in return**: co-promotion credit on the AU app store listing, a referral link tracked to their account, and first right of refusal on any formal AU partnership should GranWatch raise capital or formalise international operations.

Draft counter-proposal language: *"We'd love to bring you on as our AU growth partner. We're proposing a non-exclusive revenue share of 30% of net AU revenue (post-platform fees), on a 12-month renewable term. We'd include a performance benchmark of 100 paying AU users in year 1 to keep the arrangement active. Does that work as a starting point?"*

### App Store Category for Australia

- **Primary category: Health & Fitness** — ranks well in AU for eldercare, family wellness, and mental health adjacents. AU App Store users browse Health & Fitness for solutions to wellbeing problems, which is exactly how GranWatch should be positioned.
- **Secondary category: Lifestyle** — captures users searching for family organisation and daily life coordination tools.
- Avoid "Utilities" as a primary category — it undersells the emotional value of the product and ranks poorly for discovery in both AU and global markets.

---

## Your Right-Now Priority List

| # | Who | Action |
|---|-----|--------|
| 1 | ✅ **Done** | Resend DNS records live — email working |
| 2 | ✅ **Done** | Apple Developer Account approved (Better Creation Pty Ltd) |
| 3 | ✅ **Done** | SEO improvements, referral program, push notification backend shipped |
| 4 | ✅ **Done** | Full App Store metadata + App Store Connect guide written |
| 5 | ✅ **Done** | GitHub auto-deploy fixed — Railway native integration active |
| 6 | **Konna** | Add `FIREBASE_SERVICE_ACCOUNT_JSON` to Railway env vars (Firebase Console → Service Accounts) |
| 7 | **Konna** | Complete Lemon Squeezy KYC so payouts are enabled |
| 8 | **Konna** | Create 7 regional Lemon Squeezy pricing variants (ZAR/USD/GBP/EUR/BRL/INR/LOW) |
| 9 | **Me** | Wire up location-based pricing code (once #8 is done) |
| 10 | **Outside** | Hire a developer for 2 weeks — Capacitor wrapper + App Store submission (guide: APP-STORE-CONNECT-GUIDE.md) |
| 11 | **Konna** | Contact 3 local social workers about B2B2C pilot |
| 12 | **Konna** | Collect 5 testimonials from real users |
| 13 | **Outside** | Tagalog translator — biggest single growth unlock after app stores |

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
