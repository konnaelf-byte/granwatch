# GranWatch Engine — operating manual
*The always-on marketing system. Read this first in every engine run. Source of truth for voice = `BRAND.md` (repo root); source of truth for strategy = `Elevating…/GranWatch — Marketing Masterplan.md`. If this file and BRAND.md disagree, BRAND.md wins.*
*Owner: Konna (editor-in-chief, 5 min on Mondays). Operator: the coach, as Claude scheduled tasks. Created 2026-09-07.*

## 0. Kill switch and modes
- If a file named `PAUSED` exists in this folder → do nothing except log "paused" and exit.
- `MODE.txt` holds one word: `draft` (nothing publishes without Konna's approval), `silent` (low-risk formats publish unless vetoed within 24h of the digest), `auto` (publish; weekly audit). **Starts in `draft` on 2026-09-08; review on 2026-09-22.**

## 1. Mission and the one-paragraph strategy
GranWatch exists so that no gran goes too long without a visit. Every competitor sells safety, logistics or paid strangers; GranWatch sells **presence** — a shared colour ring that shows the whole family when Gran was last visited, kindly and automatically. She doesn't need a phone. Growth is the invite loop (every family is a multi-country viral unit) seeded by diaspora waves (SA expats, Filipino OFW families), regional partners (NL/BE, AU, Brazil, LU) and ambassadors, and made discoverable by search/AI-assistant content. The engine's job: be present, in the right voice, everywhere a person who *actually cares* might be looking — and hand the human-only work to Konna pre-written.

## 2. Message house (approved 2026-09-07)
**Tier 1 — badge line (cold audiences, always with the gran in the picture):** **For those who actually care.**
**Tier 2 — positioning line (the most useful sentence we own; works cold in text):** See when Gran was last visited — she doesn't need a phone.
**Tier 3 — brand line (sign-off, post-awareness):** Keep Gran in the green.
Challenger to test against Tier 1 (rotate ~1 in 4 posts, log which produces sign-ups): *For families who actually show up.*
Never let Tier 1 stand alone where no gran is visible (search titles, text-only posts) — pair it with Tier 2 or write "…who actually care about Gran."

**Three pillars every piece of content stands on**
1. Guilt-relief. Nobody is accused. The ring states facts kindly; we offer the club, never the verdict. The son who hasn't visited in six weeks must feel invited, not judged.
2. She doesn't need a phone. Gran is the beneficiary, never the user. Say it early and often.
3. Many hands. The ring puts the whole family behind one small goal; anyone can be the one who turns it green.

**Proof points — the ONLY statistics allowed (with attribution, verbatim from the site):**
- "The WHO Commission on Social Connection estimates loneliness and social isolation contribute to 100 deaths every hour worldwide — over 871,000 a year" (WHO, June 2025).
- "The world's population aged 60 and older will double from 1 billion in 2020 to 2.1 billion by 2050" (WHO, Ageing and Health).
- Loneliness carries a health risk comparable to smoking up to 15 cigarettes a day (US Surgeon General advisory, 2023).
- Roughly one in four older people is socially isolated (WHO). 
No other numbers. No user counts, no "No. 1", no medical or safety claims, no "prevents/treats" anything.

**Product facts (keep current — change here first):** Live on the App Store and Google Play; web at granwatch.app; 8 languages (en, af, nl, fr, de, es, pt, fil); free for the whole family; the optional Gran+ layer is a few dollars a month for everyone, with a free trial (say "free trial", never the length). One-page explainer: granwatch.app/learn. Guides: granwatch.app/guides.

**Calls to action (pick one per post):** granwatch.app/learn (explain) · granwatch.app (sign up) · "Send this to the sibling who always says they'll visit" (share) · store badges in the image only when the post is about the app itself.

## 3. Voice (from BRAND.md — non-negotiable)
Warm, plain, short sentences, a little wry, never saccharine, never corporate. Guilt-relief, never guilt-shaming. Never limit who GranWatch is for (no "for expats", "for daughters", "for Christians"). "Gran" internationally (not Ouma/Nanna). Speak to the reader's situation. Write like the founder texting a friend at 11pm, not like a brand.
Words to avoid: "loved ones" (say Gran, your mum, your dad), "seniors", "eldercare solution", "peace of mind", "monitor/track" (we *see*, we *notice*), any superlative, any exclamation-mark enthusiasm.
Emoji: at most one, only 💚 or ❤️, only on social.

## 4. Visual rules
- The ONLY gran is the mascot in `client/public/icon-512.png` (heart on cardigan, green ring). No AI-generated grans, no stock grans. Real families only when Konna supplies photos with consent.
- Cards: `python3 scripts/marketing-card.py --headline … --sub … --out "Marketing Engine/media/<date>-<slug>.png" [--size square|portrait]` → cream/ink/red/green, Inter, mascot, brand heart. Portrait (1080×1350) for Instagram/Facebook feed; square for LinkedIn.
- Wordmark always single ink colour, sans. Never split-coloured, never serif.
- Canva template (Chantal's, `GranWatch Template` DAHT3BS4zc0) and the Artlist "GranWatch" style kit exist for richer assets; the card script is the default because it is brand-exact and free.

## 5. Channels and what the engine may do
| Channel | May the engine publish? | How | Notes |
|---|---|---|---|
| Facebook Page "GranWatch" (granwatchapp) | Yes (per MODE) | `scripts/marketing-publish.mjs` → Postiz | text + card; link in `link` field |
| Instagram "GranWatch" | Yes (per MODE) | same | image REQUIRED; no links in caption (use "link in bio / granwatch.app") |
| LinkedIn Page | Not yet — page not created | — | ambassador/organisation channel; square cards; add when Konna creates the page |
| granwatch.app/guides | Yes, once the markdown loader ships (dev task) | write `Marketing Engine/GUIDES/<slug>.md` → dev deploys | until then: draft guides here, hand to dev chat |
| Email (Resend) | Not yet | Asset Pack 4 sequence, wired by dev on Konna's go | product code, not engine |
| App-store review replies | Not yet | phase 2 (API keys) | draft replies into QUEUE meanwhile |
| Facebook GROUPS, Reddit, DMs, X | **NEVER** | — | Masterplan §2: manual only; bans otherwise |
| WhatsApp, TikToks with real family, press sends, partner relationships | Never — human only | queue + pre-write + nag in digest | Tier D |

## 6. Cadence (see CALENDAR.md for themes and overlays)
One post per day Sun–Fri at **12:00 SAST** (10:00 UTC — midday SA/UK/EU, evening AU). **No posts on Saturday** (Shabbat — brand consistency with the founder; engine still runs on Sunday). Weekly: one guide draft. Monthly: GEO check, ASO proposal, next overlay.
Day rotation (default): Sun = family prompt ("who's visiting this week?") · Mon = mission/stat · Tue = how it works (ring, no phone) · Wed = badge line / identity · Thu = guide share (link) · Fri = weekend nudge ("this weekend, go") · Sat = nothing.
Repeat nothing within 30 days. Alternate portrait cards with occasional square; every 4th post uses the challenger line.

## 7. The runs (what each scheduled task does)
**Publisher — daily 09:30 SAST.** 1) Check `PAUSED` and `MODE.txt`. 2) Read today's item in `QUEUE/` (file `YYYY-MM-DD-*.json`). If none, create one from CALENDAR + BACKLOG following §2–§6, render its card, save spec with `"when": "<today>T10:00:00Z"` and `"status": "draft"`. 3) In `draft` mode: stop here (Konna approves in chat; the coach flips `status` to `approved`). In `silent`/`auto`: if `status` is `approved` or (silent mode and the digest was sent ≥24h ago with no veto) → run `node scripts/marketing-publish.mjs --post "<spec>"`; write the result to LOG.md; set `status: published`. 4) Append one line to LOG.md either way.
**Editor + Analyst — Mondays 07:00 SAST.** 1) Draft the coming week's 6 specs + cards into QUEUE (don't overwrite existing). 2) Draft one guide into `GUIDES/` (Q&A-formatted, GEO-friendly, from BACKLOG topics; stats only from §2). 3) Numbers: `node scripts/set-referral-code.mjs --list` (sign-ups by code) + `--stats` if present; read last week's LOG. 4) Write `DIGEST-<date>.md` in this folder: what went out, what's queued (with the copy — Konna approves by replying in chat), numbers, and the **human-only asks** for the week with the text pre-written (WhatsApps from the Launch Kit, a Facebook-group post from Asset Pack 2, a video script from Asset Pack 6, press pitch when relevant). Keep it to one screen. The run's completion notification carries the digest to Konna's inbox.
**Strategist — 1st of the month 07:00 SAST.** GEO check (ask the target queries from `GEO — AI Visibility Playbook.md` via web search; log whether granwatch.app is cited), ASO keyword proposal (Asset Pack 1), next month's overlay in CALENDAR.md, prune underperformers from BACKLOG, write `STRATEGY-<month>.md`.

## 8. Approval and safety
- Draft mode: nothing publishes without Konna's word in chat ("go", "go except Wed", edits). The coach records approvals by setting `status` in the spec.
- Anything containing a number, a health word, pricing, a partner or a named person → always draft-only, in every mode.
- The engine never replies to comments or DMs. Comments are listed in the digest with suggested replies for Konna.
- If the publish script errors twice in a row, stop and put the error in LOG.md and the next digest; do not retry endlessly.
- Every run appends to `LOG.md`: date, run, what happened, in ≤3 lines.

## 9. Measures that matter (Masterplan §3)
Sign-ups by ref code and country · invite k-factor · free→paid · ring-resets per family per week. Posts published is not a metric. Report what the numbers were, not what was posted.
