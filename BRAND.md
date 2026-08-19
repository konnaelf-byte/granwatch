# GranWatch — Brand One-Pager (source of truth)
*Created 2026-08-13 after Konna flagged share-card inconsistency. Any asset — OG image, store screenshot, social post, email, page — must match this. If something here changes, change it HERE first, then everywhere.*

## Logo (UPDATED 2026-08-13, Konna's call)
**The app icon IS the logo** — the illustrated granny inside the green watch-dial ring (with crown button and red heart on her cardigan), dark green background (`client/public/icon-512.png`). Use it everywhere a mark is needed: app headers, landing header, guide pages, share cards (in an iOS-style rounded square on cream), favicons. The lucide heart is retired as a brand mark (fine as a decorative UI icon).

## Wordmark
**GranWatch** in **Inter ExtraBold/Bold, single ink colour**, set beside the logo. Never split-coloured, never serif.

## Mascot
**THE ONLY GRAN is the final gran character** — the granny with the red heart on her blue cardigan inside the green watch-dial ring (`client/public/icon-512.png`). She is the face of the brand on any image asset. Never replace her with abstract symbols (the old checkmark card is retired). **⚠️ The old Manus-era gran (`og-gran.png`, hands-on-chest, heart-patterned cardigan, NO red heart) is RETIRED and DELETED from the repo (2026-08-19, Konna's call) — never reuse her from caches, old exports, or old share cards. If an asset shows a gran without the red heart on her sweater, it's the wrong gran.**

## Colours
| Role | Hex | Source |
|---|---|---|
| Heart red (primary) | `#BA2D1F` | `--primary: oklch(0.52 0.18 30)` |
| Cream background | `#FAF6F0` | `--background` / mascot bg |
| Ink | `#1D140D` | `--foreground` |
| Ring green (status/brand accent) | `#27AE60` | sampled from icon ring |
| Muted text | `#6E6459` | derived |

Green is the *status* colour (the promise). Red heart is the *brand* colour (the love). Don't swap their jobs.

## Typography
Inter (app + web). Weights: ExtraBold for wordmark/headlines, Bold for taglines, Medium/Regular for body. System-sans fallback stack is fine on server-rendered pages.

## Taglines (fixed hierarchy)
1. **Brand line:** "Keep Gran in the green." — appears with the wordmark (OG image, site title, footers).
2. **Positioning line:** "See when Gran was last visited — she doesn't need a phone." — the subtitle everywhere the brand line appears.
3. Footer affection line: "made with love, for every gran."

## Voice rules
- Guilt-RELIEF, never guilt-shaming. The ring states facts kindly; copy never accuses.
- Never limit who GranWatch is "for" (Konna, 2026-08-12). Speak to the reader's situation; don't fence the product.
- Gran is the beneficiary, never the user: "she doesn't need a phone" appears early and often.

## Canonical share image
`client/public/og-default.png` (1200×630, rebuilt 2026-08-13): mascot left, ♥ GranWatch + both taglines right, green base bar. Reference with `?v=N` bump when regenerated (link-preview caches). Rebuild recipe: coach has the script (PIL, Inter font, colours above).
