/**
 * Client-side geolocation pricing hook.
 *
 * Fetches the visitor's localised pricing tier from the server
 * (which uses their IP to determine region — no client-side IP lookup needed).
 *
 * Returns the price display string and currency symbol to show in the UI
 * before the user clicks Subscribe.
 */

import { trpc } from "@/lib/trpc";

export interface LocalizedPricing {
  tier: string;
  priceDisplay: string;   // e.g. "R79", "£3.99", "$4.99"
  currencySymbol: string; // e.g. "R", "£", "$"
  priceAmount: string;    // e.g. "79", "3.99"
  currency: string;       // ISO 4217, e.g. "ZAR", "GBP"
}

/** Default shown while loading — avoids layout shift. */
export const DEFAULT_PRICING: LocalizedPricing = {
  tier: "ZAR",
  priceDisplay: "R79",
  currencySymbol: "R",
  priceAmount: "79",
  currency: "ZAR",
};

/**
 * Returns the localised pricing for the current user.
 * Falls back to ZAR R79 while loading or on error.
 */
export function useLocalizedPricing(): LocalizedPricing {
  const { data } = trpc.subscription.pricingInfo.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1 hour — country doesn't change mid-session
    retry: false,
  });

  return data ?? DEFAULT_PRICING;
}
