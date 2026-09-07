# GranWatch — Brand One-Pager (source of truth)
*Created 2026-08-13 after Konna flagged share-card inconsistency. Any asset — OG image, store screenshot, social post, email, page — must match this. If something here changes, change it HERE first, then everywhere.*

## Logo (UPDATED 2026-08-13, Konna's call)
**The app icon IS the logo** — the illustrated granny inside the green watch-dial ring (with crown button and red heart on her cardigan), dark green background (`client/public/icon-512.png`). Use it everywhere a mark is needed: app headers, landing header, guide pages, share cards (in an iOS-style rounded square on cream), favicons. The lucide heart is retired as a brand mark (fine as a decorative UI icon).

## Wordmark
**GranWatch** in **Inter ExtraBold/Bold, single ink colour**, set beside the logo. Never split-coloured, never serif.

## Mascot
**THE ONLY GRAN is the final gran character** — the granny with the red heart on her blue cardigan inside the green watch-dial ring (`client/public/icon-512.png`). She is the face of the brand on any image asset. Never replace her with abstract symbols (the old checkmark card is retired). **⚠️ The old Manus-era gran (`og-gran.png`, hands-on-chest, heart-patterned cardigan, NO red heart) is RETIRED and DELETED from the repo (2026-08-19, Konna's call) — never reuse her from caches, old exports, or old share cards. If an asset shows a gran without the red heart on her sweater, it's the wrong gran.**

## Colours (v2 — corrected 2026-08-30 after Chantal flagged mismatches; sampled from live CSS + actual icon pixels)

**App & website (UI):**
| Role | Hex | Source |
|---|---|---|
| Primary red (buttons/links) | `#BA2D1F` | `--primary: oklch(0.52 0.18 30)` |
| Cream background | `#FCF8F1` | `--background: oklch(0.98 0.01 80)` |
| Ink | `#1D140D` | `--foreground` |
| Muted panel | `#F6EDE0` | `--muted` |
| Secondary | `#FAE9CE` | `--secondary` |
| Accent | `#FFE8BE` | `--accent` |
| Muted text | `#6E6459` | derived |

**The status ring (exactly as StatusRing.tsx draws it):**
| State | Hex |
|---|---|
| Green — "in the green" | `#22C55E` |
| Yellow — getting long | `#EAB308` |
| Orange — overdue soon | `#F97316` |
| Red — too long | `#EF4444` |
| Grey — no data yet | `#94A3B8` |

**Logo & icon (the mascot artwork, sampled from icon-512.png):**
| Role | Hex |
|---|---|
| Heart red (cardigan heart) | `#D23B26` |
| Heart outline | `#4A0E05` |
| Icon ring green (lighter than UI green) | `#7ABD56` |
| Icon background green (gradient) | `#223B25` → `#0D1C0F` |

⚠️ Superseded values from v1 of this doc — do not use: cream `#FAF6F0` (real: `#FCF8F1`), ring green `#27AE60` (real UI ring: `#22C55E`; real icon ring: `#7ABD56`), heart red as `#BA2D1F` (that's the UI primary; the icon heart is `#D23B26`). Palette card for designers: `GranWatch-Colour-Palette-v2.png` in the Drive Brand Assets folder. Standalone heart asset: `granwatch-heart.svg` / `granwatch-heart-2048.png` (same folder).

Green is the *status* colour (the promise). Red heart is the *brand* colour (the love). Don't swap their jobs.

## Typography
Inter (app + web). Weights: ExtraBold for wordmark/headlines, Bold for taglines, Medium/Regular for body. System-sans fallback stack is fine on server-rendered pages.

## Taglines (fixed hierarchy — UPDATED 2026-09-07, Konna's call)
1. **Badge line (cold audiences — only ever with the gran in the picture):** "For those who actually care." Never alone in text-only places (search titles, LinkedIn text): pair it with line 2, or write "…who actually care about Gran." Challenger under test: "For families who actually show up."
2. **Positioning line:** "See when Gran was last visited — she doesn't need a phone." — the most useful sentence we own; works cold; the subtitle everywhere the badge or brand line appears.
3. **Brand line (sign-off, post-awareness):** "Keep Gran in the green." — appears with the wordmark (OG image, site title, footers). Not a first-impression headline.
4. Footer affection line: "made with love, for every gran."
Why: a first-time reader can't parse "in the green" until they know the ring. The badge line sorts by identity — it offers a club ("those who actually care"), it never accuses (guilt-relief rule below). No superlatives ("No. 1") without substantiation.

## Voice rules
- Guilt-RELIEF, never guilt-shaming. The ring states facts kindly; copy never accuses.
- Never limit who GranWatch is "for" (Konna, 2026-08-12). Speak to the reader's situation; don't fence the product.
- Gran is the beneficiary, never the user: "she doesn't need a phone" appears early and often.

## Canonical share image
`client/public/og-default.png` (1200×630, rebuilt 2026-08-13): mascot left, ♥ GranWatch + both taglines right, green base bar. Reference with `?v=N` bump when regenerated (link-preview caches). Rebuild recipe: coach has the script (PIL, Inter font, colours above).
