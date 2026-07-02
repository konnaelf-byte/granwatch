/**
 * Gift Partner Registry — the single source of truth for "Send Flowers" /
 * "Send a Gift" (and future "Send Gran on an Adventure") buttons.
 *
 * HOW IT WORKS
 *  - Buttons resolve at runtime via trpc.gifts.optionsForElder using the
 *    GRAN'S country (delivery destination), not the buyer's location.
 *  - Per category, the highest-priority ACTIVE partner covering that country
 *    wins ("top of the deck"). Local/direct deals should use priority >= 100
 *    so they always beat global fallbacks (priority < 100).
 *  - Adding/changing a partner = edit this file + git push (live in ~3 min,
 *    no app release). When partners start applying for placement, migrate
 *    this to a DB table + admin UI — the resolver contract stays identical.
 *
 * COMMISSION LINKS
 *  - Put the full affiliate/tracking URL in `url`. Use {SUBID} where the
 *    network supports per-click subid attribution; the resolver replaces it
 *    with a gift-log reference for revenue reconciliation.
 */

export type GiftCategory = "flowers" | "gift" | "experience";

export interface GiftPartner {
  /** Stable id, also written to giftLogs.partnerName for attribution. */
  id: string;
  /** Display name (shown to users on the button/subtitle). */
  name: string;
  category: GiftCategory;
  /** ISO 3166-1 alpha-2 codes this partner delivers to, or "global". */
  countries: string[] | "global";
  /** Full affiliate/tracking URL. May contain {SUBID}. */
  url: string;
  /** Higher wins. Local/direct deals >= 100; global fallbacks < 100. */
  priority: number;
  active: boolean;
  /** Internal note: deal status, commission rate, network. Not sent to client. */
  note?: string;
}

export const GIFT_PARTNERS: GiftPartner[] = [
  // ── Local / direct deals (priority >= 100) ────────────────────────────────
  {
    id: "petal-and-post",
    name: "Petal & Post",
    category: "flowers",
    countries: ["ZA"],
    url: "https://petalandpost.co.za/product/todays-cape-town-posy/",
    priority: 100,
    active: true,
    note: "Test-phase link; pitch commission deal once app is live in stores.",
  },
  {
    id: "petal-and-post-gifts",
    name: "Petal & Post",
    category: "gift",
    countries: ["ZA"],
    url: "https://petalandpost.co.za/gifts-flowers/gift-set-hamper-delivery/",
    priority: 100,
    active: true,
    note: "Test-phase link; same pitch as flowers.",
  },

  // ── Global fallbacks (priority < 100) ─────────────────────────────────────
  // Slots reserved: activate once affiliate approvals land (see
  // GIFT-AFFILIATE-PLAYBOOK.md). Examples ready to fill in:
  // {
  //   id: "floraqueen-global",
  //   name: "FloraQueen",
  //   category: "flowers",
  //   countries: "global", // 100+ countries
  //   url: "<affiliate deep link with {SUBID}>",
  //   priority: 50,
  //   active: false,
  //   note: "Apply via their affiliate program post-launch.",
  // },
];

/**
 * Resolve the best partner per category for a gran's country.
 * - country null/unknown → treated as "ZA" for now (launch market default);
 *   revisit when global fallbacks are active.
 * - Returns at most one partner per category (the top of the deck).
 */
export function resolveGiftOptions(country: string | null | undefined): GiftPartner[] {
  const c = (country ?? "ZA").toUpperCase();
  const eligible = GIFT_PARTNERS.filter(
    (p) => p.active && (p.countries === "global" || p.countries.includes(c))
  );

  const byCategory = new Map<GiftCategory, GiftPartner>();
  for (const p of eligible.sort((a, b) => b.priority - a.priority)) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, p);
  }
  return [...byCategory.values()];
}
