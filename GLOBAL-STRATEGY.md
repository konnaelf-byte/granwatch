# GranWatch Global Strategy — i18n · Go-to-Market · Partners · Super Whos
*Drafted overnight 2026-07-03 by Opus. Companion docs: `GIFT-AFFILIATE-PLAYBOOK.md`, `AFFILIATE-APPLICATION-PACK.md`, `ANDROID-ROADMAP.md`.*

## 1. Languages (i18n) — the plan
**Don't translate yet; architect now, translate at the trigger.** A string-refactor mid-TestFlight would risk the launch for zero users who need it today.

**Architecture (when we do it):** react-i18next with JSON locale files. Because the app loads its UI live from granwatch.app, adding a language is a *deploy*, not an app-store release — a genuine competitive advantage. One ~2-day pass to extract all strings into `en.json` (I can do this mechanically), then each new language is just a translated JSON file. Server-side emails/notifications get a `locale` column per user and per-locale templates.

**GranWatch's clever angle — localize by GRAN, not just by user:** we already store the gran's country for gifting. The family may be in London while Gran is in Lisbon; birthday/overdue emails to Portuguese cousins should speak Portuguese. Locale preference per *member*, defaulting from device language — cheap once the plumbing exists.

**Sequence:** ship EN everywhere → extract strings (post-launch quiet week) → first languages chosen by actual install geography, not guesses. Likely order given SA roots + partner contacts (AU/NL/BR): **Afrikaans** (near-free for you to QA, deep emotional resonance for the SA market — "Ouma & Oupa" language sells itself), **Dutch** (NL contact), **Portuguese-BR** (BR contact), then Spanish/German. Store listings translate per-market at the same moment (App Store + Play both support localized listings; big conversion lift, low effort).

## 2. Go-to-market — beachhead, then ripples
**Beachhead = South Africa** (you, your network, Afrikaans families, Petal&Post, safari/wine partners). Win a market you can touch: SA has a huge "kids emigrated, gran stayed" diaspora dynamic — which IS the product's core emotion.

**The diaspora wedge is the growth engine:** the *buyer* is the guilt-carrying emigrant in London/Sydney/Amsterdam; the *subject* is Gran in SA. Market to diaspora communities (SA expat Facebook groups, Afrikaans churches abroad, expat newsletters) — one member installs, invites the whole family, and the app spreads *inward* to SA and *outward* to wherever siblings live. Every family is a multi-country viral unit. The invite-code flow is the growth loop; instrument it.

**Store launch checklist adds:** localized screenshots with the animated-ring story; App Store "family" + "eldercare" keyword sets; a proper press one-pager (I'll draft when Build 10 clears review).

## 3. Revenue layers (already built, sequenced)
1. **Gran+** subscriptions ($2.99, Apple-localized pricing) — the base.
2. **Gifting affiliate** — live registry, guilt-moment email links. Watch giftLogs; apply to CJ/Awin post-launch (pack ready).
3. **Experiences** ("Send Gran on an Adventure") — parked until gifting proves clicks; SA safari/wine lead-gen deals are high-ticket and uniquely defensible in the beachhead.
4. **Placement auctions** — when traffic justifies it, partners pay for top-of-deck (the priority field is the mechanism).

## 4. Super Whos (Who Not How — the people who each remove a "How")
The principle: stop asking "how do I do X" and ask "WHO already has this capability". Candidates, in priority order:

- **The Diaspora Connector** — an SA-expat community figure (big Facebook group admin, expat newsletter writer, Afrikaans radio/podcast host abroad, e.g. in Perth/London). One shout-out = hundreds of perfect-fit families. *Ask:* founding-family status + input, not money. **This is the highest-leverage single Who.**
- **The Eldercare Credibility Who** — a geriatric care professional / dementia-care influencer / eldercare NGO (e.g. SA's Rand Aid, Age-in-Action) who validates the "regular visits matter" message. Turns the app from gadget into recommended practice; unlocks care-home partnerships (a care home recommending GranWatch to every resident family = B2B2C channel).
- **The Gifting BD Who** — someone who already knows the flower/gifting industry (even Petal&Post's founder as advisor) — one warm intro chain replaces fifty cold applications.
- **The Localization Who** — not a translation agency: one bilingual power-user per language who loves the product (recruit from early TestFlight testers; credit them in-app). Free, loyal, better quality than agencies for a family product's tone.
- **The App-Growth Who** — a fractional ASO/growth person for the store-listing craft (keywords, screenshots, review velocity) once installs start; cheap on contract, expensive to learn yourself.
- **The Content Flywheel Who** — you already ARE this one (Fox Nation, music, video repurposing skills) — GranWatch founder-story content ("I built an app so my kids' generation never forgets their grans") is exactly your existing distribution muscle. Don't outsource the voice.
- **Claude (house Who)** — engineering, ops, dashboards, copy, this document. Already on payroll. 😉

**Rule for every Who:** define the outcome, not the task ("GranWatch known in every SA-expat community in Australia by December"), give ownership, measure results.

## 5. Next 14 days (proposed)
1. Build 10 clears beta review → friends & family day → fix round → **App Store submission**.
2. Play Console: create app entry, internal testing AAB (toolchain ready; APK already builds).
3. Push notifications Build 11 (waiting on Firebase files).
4. giftLogs click read-out after a week of family testing → affiliate applications on launch.
5. First Diaspora Connector outreach — draft message ready on request.
