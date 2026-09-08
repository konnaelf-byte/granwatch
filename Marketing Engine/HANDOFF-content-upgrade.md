# Handoff — Engine Phase 1b: the content upgrade
*Written 2026-09-07 by the coach for a new task. Read ENGINE.md first, then this.*

## Where things stand
- The engine machinery is built and scheduled in draft mode: QUEUE specs → weekly Google Sheet in Drive ("GranWatch Marketing / Engine — For approval") → Konna + Chantal set Status=Approved → Publisher posts via Postiz (FB + IG "GranWatch") at 12:00 SAST. Kick-off Mon 14 Sep. Scripts: `scripts/marketing-publish.mjs`, `scripts/marketing-sheet.mjs`, `scripts/marketing-card.py`.
- Konna's verdict on the current creative (text cards from marketing-card.py): "wallpaper" — brand-correct but will earn nothing on pages with zero followers. Agreed. Text cards drop to at most one per week.
- Chantal's Canva template `DAHT3BS4zc0` ("GranWatch Template", 5 real pages + reference pages) is the visual system: illustrated mascot scenes, infographic swipe pages, phone mockup, "You can fake caring, but you can't fake showing up." Konna: "will do way better… but even that's not quite enough."

## Strategy (agreed in chat, 7 Sep)
Zero-follower pages get reach from four places only: Reels (pushed to non-followers), shares into WhatsApp/groups (human), partner reposts (Chantal, Jeanné/Selah), paid (parked until Dec numbers). Pages' jobs in phase 1: credibility for people arriving from WhatsApp, a library partners repost, Reels for discovery.
Target weekly mix: 2 Reels (1 animated mascot scene, 1 app demo or Konna's real footage) · 1 carousel from Chantal's infographic pages · 1 illustrated scene card · 1 plain text card · Sunday family prompt.

## Production stack to build (in order of leverage)
1. **Canva as the renderer.** Turn Chantal's pages into Brand Templates with autofill fields (headline, body, scene image); engine fills per post via the Canva connector (create-brand-template-draft / publish-brand-template / create-design-from-brand-template / export-design PNG + MP4). Check the account supports Brand Templates (team oBZGYGoGvfvvaE1-KUhQ8s).
2. **Artlist for the mascot in motion.** Style kit "GranWatch" already holds the character references. Image-to-video of her scenes (ring red→green; gran looks up as the door opens) = on-brand Reels for credits, not cash. First one needs Konna's yes before rendering (he rejected a photoreal expat concept before; illustrated motion of the owned character is the fit). Balance ≈ 6.4k credits. Budget undecided — treat 500 credits as the ceiling for tests without asking; show the cost of each generation before running it.
3. **Real footage from Konna,** cut by Adobe Quick Cut (connector) / CapCut. Highest-engagement format; stays a Tier D digest ask.
4. **No human designer (Konna, 7 Sep).** Chantal is ambassador + regional partner, not a freelancer — she approves on the sheet, she does not produce. No AlphaWave designer yet. Default: the coach builds the templates itself from Chantal's existing five pages using the Canva connector (copy-design → edit-design → resize → brand template with autofill), plus Artlist for motion. If a page needs craft the tools can't give, put it in the digest as a decision, don't stall.
5. **Verify Chantal's statistics before any ship:** "1 in 3 adults over 65", "46% say loneliness harms health", "100+ million older adults", "premature death +20–30%" (sources on her page: WHO, AARP, NIA). Only ENGINE.md §2 stats are approved today; extend the whitelist with sourced lines. Keep the smoking comparison kind (guilt-relief rule) — the ashtray page is near the line.

## First moves for the new task
1. Verify the four statistics; extend ENGINE.md §2.
2. Convert `DAHT3BS4zc0` into autofill Brand Templates via the Canva connector; wire `scripts/marketing-canva.mjs` (fill → export PNG/MP4 → `Marketing Engine/media/`).
3. Generate ONE test Reel (mascot scene, ring turning green) with Artlist for Konna's yes/no — show cost first.
4. Rebuild week of 14 Sep in the new mix on the same approval sheet (id 1HW14DU1E5XgTWoTODyGEH2gE3jqd9kQ62sULL0KZWVs); replace the six text-card rows; copy new media to the Drive mirror.
5. Short note for Chantal in Drive "3. Content Drafts": what the engine now makes from her template and how to approve — not a work brief.
Update ENGINE.md §4 (visual rules) and §6 (mix) when done; note in STATUS.md.
