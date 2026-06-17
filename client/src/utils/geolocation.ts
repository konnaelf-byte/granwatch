/**
 * Pricing display for Gran+.
 *
 * Gran+ is priced at ZAR 79/month globally. Lemon Squeezy automatically
 * converts this to the customer's local currency at checkout.
 *
 * True purchasing-power-parity variants (USD $4.99, GBP £3.99, etc.) will be
 * added when the store upgrades to a paid Lemon Squeezy plan that supports
 * multi-currency variant pricing.
 */

export interface LocalizedPricing {
  tier: string;
  priceDisplay: string;   // e.g. "R79"
  currencySymbol: string; // e.g. "R"
  priceAmount: string;    // e.g. "79"
  currency: string;       // ISO 4217, e.g. "ZAR"
}

/** The single global price. LS converts to local currency at checkout. */
export const DEFAULT_PRICING: LocalizedPricing = {
  tier: "ZAR",
  priceDisplay: "R79",
  currencySymbol: "R",
  priceAmount: "79",
  currency: "ZAR",
};

/**
 * Returns pricing display info.
 * Currently a single global price — Lemon Squeezy handles currency conversion at checkout.
 */
export function useLocalizedPricing(): LocalizedPricing {
  return DEFAULT_PRICING;
}
