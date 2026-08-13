# GranWatch — Brand One-Pager (source of truth)
*Created 2026-08-13 after Konna flagged share-card inconsistency. Any asset — OG image, store screenshot, social post, email, page — must match this. If something here changes, change it HERE first, then everywhere.*

## Wordmark
**♥ GranWatch** — the red heart, then "GranWatch" in **Inter ExtraBold/Bold, single ink colour**. Never split-coloured, never serif. (This matches the app header and splash.)

## Mascot
The illustrated granny in the green ring (`client/public/og-gran.png` / app icon). She is the face of the brand on any image asset. Never replace her with abstract symbols (the old checkmark card is retired).

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
