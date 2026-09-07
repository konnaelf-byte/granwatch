# GranWatch Engine — build plan (v0, 2026-09-06, awaiting Konna's approval)

*An always-on marketing system run by the coach as Claude scheduled tasks. Complements the intro campaign and every future campaign; it does not replace the human-only work in the Masterplan's Tier D.*

## What is possible today (research, Sept 2026)

- **Posting to GranWatch's OWN pages (Facebook Page, Instagram Business, LinkedIn Page, later TikTok/YouTube/Threads) is fully automatable and policy-compliant** — via Meta's Graph API (Business IG linked to a FB Page, app review, long-lived tokens) or, far faster, via a scheduler that already holds the platform approvals. **Postiz** (open-source, cloud $29/mo, public API on every tier, 15+ networks, agent CLI/SDK) is the shortest path. LinkedIn's own API needs a registered company + verified Page + 1–4 weeks of review — Better Creation qualifies, but Postiz sidesteps it.
- **What agents do reliably:** content creation/repurposing in a trained brand voice, scheduling, analytics, comment triage. **What still needs a human:** anything with health/pricing/legal claims (hallucination risk ~15–27%), crisis replies, and disclosure (EU AI Act trend). Standard answer = human-in-the-loop with escalation rules and weekly audits.
- **What must stay manual** (the Masterplan already says so, and platform rules agree): Facebook GROUP seeding, Reddit posting, real-family TikToks, the personal WhatsApps, pressing send on press pitches. Automating those is the fastest route to losing the channel.
- **App-store review replies** are automatable on both stores (App Store Connect API, Google Play Reply-to-Reviews API).
- **Email** is already wired (Resend) — the Day 0/3/10 + trial-end sequence from Asset Pack 4 was written but never wired.
- **SEO/GEO** rails exist: server-rendered /guides, /faq, /compare, sitemap (contentRoutes.ts) — content is hard-coded in TS today; the engine needs a markdown-file path so it can ship new guides without touching app code.

## Architecture

**Runtime:** Claude scheduled tasks (cloud, on Konna's Max plan — no API keys), with the Mac bound for repo/DB scripts. Connectors used: Gmail, Google Drive, Canva (Chantal's GranWatch template), Artlist (GranWatch style kit), web search.

**Memory folder:** `GranWatch data from Manus/Marketing Engine/`
- `ENGINE.md` — operating manual: mission, audiences/waves, voice rules (BRAND.md: guilt-relief, never fence who it's for, gran is the beneficiary, only-gran mascot), verified-stats whitelist, hard DON'Ts.
- `CALENDAR.md` — weekly cadence + monthly themes + **campaign overlays** (dated blocks: intro campaign; Oct loneliness campaign with Jeanné; Dec gift season/Awin links; Feb S2 airs/Fox Nation credit).
- `BACKLOG.md` — idea queue seeded from Asset Pack (10 video scripts, 3 expat posts, flagship article, comment-reply bank, press pitch) + guide topics from the GEO playbook.
- `QUEUE/` — drafts awaiting approval. `LOG.md` — everything published + weekly numbers.

**Three scheduled tasks**
1. **Publisher — daily 06:30 SAST.** One brand-true post/day to FB Page + IG + LinkedIn via Postiz (image from Canva template or Artlist kit); replies to new store reviews; partner/ambassador touches on milestones (first sign-up via their code, etc.).
2. **Editor + Analyst — Mondays.** One new guide/FAQ shipped to granwatch.app/guides (SEO/GEO); queue refreshed for the week; **one digest email to Konna**: what went out, sign-ups by ref code/country (`set-referral-code.mjs --list` + growth dashboard), ring-resets, and the Tier-D asks with everything pre-written ("record script 4", "post SA-2 in Aussiekaners", "send press pitch to SAPeople") — one reply approves.
3. **Strategist — monthly.** GEO check (ask the AI assistants the target queries, log citations), ASO keyword refresh proposal, next month's campaign overlay, prune what didn't work.

**Governance / safety**
- Phase 1 (weeks 1–2) **draft mode**: nothing publishes without Konna's "go".
- Phase 2 **silent approval**: low-risk formats (guides, template posts, review replies) publish unless vetoed within 24h of the digest.
- Phase 3 **autopilot** with weekly audit.
- Hard rules: no claims outside the verified list; no FB groups/Reddit/DMs; AI-disclosure where required; **kill switch** = pause the scheduled task or drop a `PAUSED` file in the folder.

## What Konna does once (~1 hour)
1. Postiz account ($29/mo) → connect granwatchapp FB + IG and the LinkedIn Page (decide: GranWatch page or Better Creation page).
2. App Store Connect API key (Marketing/Customer Support role) + Play service account with reply permission — or defer reviews to Phase 2.
3. Approve `ENGINE.md` rules and the verified-stats list.
4. Say "go" to wire the Asset-4 email sequence into the server cron (dev route).

## Costs
Postiz $29/mo; Artlist credits (existing Max Pro); nothing else. Build: ~1–2 coach-days. Konna: ~1 hour setup + a 5-minute Monday reply.

## What it will NOT do
Replace the personal wave, FB groups, family TikToks, press sends, partner relationships. It queues those, pre-writes them, and nags weekly.

## Success metric
Not posts published — the Masterplan's weekly numbers: sign-ups (by code/country), invite k-factor, free→paid, ring-resets per family.

## Decisions needed before building
(a) Postiz vs direct Meta/LinkedIn APIs — recommend Postiz. (b) Which LinkedIn page. (c) Start in draft mode for 2 weeks — recommended.
