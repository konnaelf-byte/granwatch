# Gift Affiliate Playbook — filling the registry
*Drafted 2026-07-02. Companion to `server/giftPartners.ts` (the live registry). Apply to these programs AFTER the app is live in the stores — networks want a live property to review, and granwatch.app + store listings make approval easy.*

## How the system works (already live)
Buttons resolve per-gran: the registry picks the highest-priority active partner covering the **gran's country**. Local/direct deals (priority ≥ 100) always outrank global fallbacks (< 100). Adding a partner = one entry in `server/giftPartners.ts` + git push (live in ~3 min, no app release). Every tap is logged to `giftLogs` with the partner id, so commissions can be reconciled against network reports.

## Tier 1 — global flower fallback (apply first)
**FloraQueen** — delivers in 100+ countries via local florists; the single best "everywhere else" fallback. Tiered commission: 10% (≤50 sales/mo) → 12% → 13% (>100/mo); ~6% conversion rate; runs on **CJ Affiliate** (also listed on FlexOffers). Slow payment cycle (~4 months average) but that's normal for the category.
→ Apply at CJ Affiliate → search "FloraQueen". Fill the reserved slot in the registry (`floraqueen-global`, priority 50, `active: true` once approved).

**Interflora / Fleurop** — the century-old florist relay network; strong brand trust with exactly our demographic. Programs are **per-country** (UK on Awin ~6%, AU on Commission Factory up to 10%, etc.), so treat it as a premium regional layer (priority ~75) in the countries where you join, on top of FloraQueen.

**1-800-Flowers** — 6% + first-order bonus; strongest in US/CA. Good priority-75 layer for North America once you have US users.

## Tier 2 — gifts category
Gift hampers/baskets have no single global player like FloraQueen. Pragmatic path: FloraQueen also sells gift sets (one approval covers both categories initially), then add per-country gift merchants from Awin/CJ as user geography emerges. Amazon deliberately skipped: country-siloed programs + weak gifting UX.

## Tier 3 — "Send Gran on an Adventure" (parked until gifting proves clicks)
**GetYourGuide** and **Viator** — both ~8% on completed bookings, 30-day cookie, global coverage, easy approval. One of them = the global experiences fallback. SA safari/wine-tour operators for the elderly = direct **lead-gen deals** (pay per lead, not commission) — Konstand hunts these personally; they slot in at priority ≥ 100, `category: "experience"`.

## Network applications (the actual to-do list, post-launch)
1. **CJ Affiliate** (publisher signup, free) → FloraQueen. Property: granwatch.app + App Store listing.
2. **Awin** (publisher signup, $5 refundable deposit, review ≈ 2 working days) → Interflora UK + browse "Gifts & Flowers" merchants per country.
3. **1800flowers.com/become-an-affiliate** → direct/CJ.
4. Later: GetYourGuide or Viator partner program for experiences.

When each approval lands, tell Claude the tracking link → registry updated + deployed same day. Use the `{SUBID}` placeholder where the network supports per-click subids so giftLogs ↔ network reports reconcile.

## Petal & Post (and future direct deals)
Pitch after store launch: GranWatch sends purchase-intent traffic at the exact moment of guilt/love (birthday + red-alert notifications, not just profile buttons); ask 10–15% commission or a flat per-order fee, tracked via a dedicated discount/ref code. Every direct deal beats network fallbacks automatically (priority ≥ 100). Long-term: when volume grows, partners *apply* for top-of-deck placement — the priority field is the auction.

## The metric that decides everything
Watch `giftLogs` click volume during F&F testing and early launch. Healthy clicks → invest in BD and more partners. Near-zero → fix placement/triggers first (put gift links inside birthday + red-alert emails/pushes — the highest-intent moments) before hunting any deals.

### Sources
- [Awin: FloraQueen US profile](https://ui.awin.com/merchant-profile/109128) · [FloraQueen program review](https://linkclicky.com/affiliate-program/floraqueen/) · [FlexOffers listing](https://www.flexoffers.com/affiliate-programs/floraqueen-affiliate-program/)
- [Interflora on Awin](https://ui.awin.com/merchant-profile/1969) · [Interflora AU on Commission Factory](https://www.commissionfactory.com/advertiser-directory/interflora-affiliate-program/35555) · [Interflora EPC data](https://avidaffiliate.com/programs/interflora-co-uk/)
- [1-800-Flowers affiliate page](https://www.1800flowers.com/become-an-affiliate)
- [Viator vs GetYourGuide 2026](https://automate.travel/blog/viator-vs-getyourguide-for-operators/) · [Viator affiliate review](https://www.creator-hero.com/blog/viator-affiliate-program-in-depth-review-pros-and-cons)
- [Awin requirements](https://success.awin.com/s/article/What-are-the-requirements-for-joining-the-Awin-network?language=en_US) · [Awin application process](https://www.awin.com/gb/compliance-and-regulations/application-process-and-joining-fee)
