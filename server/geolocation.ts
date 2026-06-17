/**
 * Geolocation-based pricing for Gran+.
 *
 * Uses ipapi.co (free, no API key, 1 000 req/day) to look up the visitor's
 * country from their IP, then maps it to one of 7 pricing tiers.
 *
 * Variant IDs are set via Railway env vars (LS_VARIANT_ID_*).
 * Until they exist, every tier falls back to the default ZAR variant so the
 * app stays functional while Konna creates the variants in the LS dashboard.
 *
 * Tier map:
 *   ZAR  — South Africa                  R79/mo
 *   GBP  — UK, Ireland                   £3.99/mo
 *   EUR  — Eurozone + wider Europe        €4.49/mo
 *   BRL  — Brazil                         R$14.99/mo
 *   INR  — India                          ₹149/mo
 *   LOW  — SE Asia, Sub-Saharan Africa,   $2.99/mo
 *           Central America, South Asia
 *   USD  — Everything else                $4.99/mo
 */

import { ENV } from "./_core/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PricingTier = "ZAR" | "GBP" | "EUR" | "BRL" | "INR" | "LOW" | "USD";

export interface PricingInfo {
  tier: PricingTier;
  variantId: string;
  /** Human-readable price, e.g. "R79" or "£3.99" */
  priceDisplay: string;
  /** e.g. "R", "£", "€" */
  currencySymbol: string;
  /** Numeric amount as string, e.g. "79", "3.99" */
  priceAmount: string;
  /** ISO 4217 code, e.g. "ZAR", "GBP" */
  currency: string;
}

// ─── Pricing tier → display info ─────────────────────────────────────────────

const TIER_INFO: Record<PricingTier, Omit<PricingInfo, "tier" | "variantId">> = {
  ZAR: { priceDisplay: "R79",      currencySymbol: "R",  priceAmount: "79",    currency: "ZAR" },
  GBP: { priceDisplay: "£3.99",    currencySymbol: "£",  priceAmount: "3.99",  currency: "GBP" },
  EUR: { priceDisplay: "€4.49",    currencySymbol: "€",  priceAmount: "4.49",  currency: "EUR" },
  BRL: { priceDisplay: "R$14.99",  currencySymbol: "R$", priceAmount: "14.99", currency: "BRL" },
  INR: { priceDisplay: "₹149",     currencySymbol: "₹",  priceAmount: "149",   currency: "INR" },
  LOW: { priceDisplay: "$2.99",    currencySymbol: "$",  priceAmount: "2.99",  currency: "USD" },
  USD: { priceDisplay: "$4.99",    currencySymbol: "$",  priceAmount: "4.99",  currency: "USD" },
};

// ─── Country → tier ───────────────────────────────────────────────────────────

const GBP_COUNTRIES  = new Set(["GB", "IE", "GG", "JE", "IM"]);

const EUR_COUNTRIES  = new Set([
  "DE", "FR", "NL", "BE", "AT", "CH", "ES", "IT", "PT", "SE", "NO", "DK",
  "FI", "PL", "CZ", "HU", "RO", "GR", "BG", "HR", "SK", "SI", "EE", "LV",
  "LT", "LU", "MT", "CY", "IS", "LI", "AD", "MC", "SM", "VA",
]);

const BRL_COUNTRIES  = new Set(["BR"]);

const INR_COUNTRIES  = new Set(["IN"]);

/** Lower-income markets: SE Asia, Sub-Saharan Africa, South Asia, Central America */
const LOW_COUNTRIES  = new Set([
  // South Asia
  "BD", "PK", "LK", "NP", "AF",
  // Southeast Asia
  "PH", "VN", "ID", "KH", "MM", "LA", "TL",
  // Sub-Saharan Africa (excluding ZA which has its own tier)
  "NG", "KE", "GH", "ET", "UG", "TZ", "ZM", "ZW", "CM", "CI", "SN", "MZ",
  "MG", "ML", "BF", "MW", "NE", "TD", "GN", "RW", "SO", "CD", "AO", "SD",
  // Central America + Caribbean
  "GT", "HN", "SV", "NI", "HT", "JM", "DO",
  // North Africa
  "EG", "MA", "TN", "LY", "DZ",
]);

export function getPricingTier(countryCode: string): PricingTier {
  const cc = (countryCode ?? "").toUpperCase();
  if (cc === "ZA")                 return "ZAR";
  if (GBP_COUNTRIES.has(cc))      return "GBP";
  if (EUR_COUNTRIES.has(cc))      return "EUR";
  if (BRL_COUNTRIES.has(cc))      return "BRL";
  if (INR_COUNTRIES.has(cc))      return "INR";
  if (LOW_COUNTRIES.has(cc))      return "LOW";
  return "USD";
}

// ─── Variant ID lookup ────────────────────────────────────────────────────────

const DEFAULT_VARIANT_ID = process.env.LS_VARIANT_ID ?? "1681701";

/** Returns the LS variant ID for a given tier, falling back to ZAR if not yet set. */
export function getVariantIdForTier(tier: PricingTier): string {
  switch (tier) {
    case "ZAR": return process.env.LS_VARIANT_ID         ?? DEFAULT_VARIANT_ID;
    case "USD": return process.env.LS_VARIANT_ID_USD     ?? DEFAULT_VARIANT_ID;
    case "GBP": return process.env.LS_VARIANT_ID_GBP     ?? DEFAULT_VARIANT_ID;
    case "EUR": return process.env.LS_VARIANT_ID_EUR     ?? DEFAULT_VARIANT_ID;
    case "BRL": return process.env.LS_VARIANT_ID_BRL     ?? DEFAULT_VARIANT_ID;
    case "INR": return process.env.LS_VARIANT_ID_INR     ?? DEFAULT_VARIANT_ID;
    case "LOW": return process.env.LS_VARIANT_ID_LOW     ?? DEFAULT_VARIANT_ID;
    default:    return DEFAULT_VARIANT_ID;
  }
}

// ─── IP → PricingInfo ─────────────────────────────────────────────────────────

/**
 * Resolve a client IP to full pricing info.
 * Falls back to USD if the lookup fails or the IP is private/local.
 */
export async function getPricingForIp(ip: string): Promise<PricingInfo> {
  let tier: PricingTier = "USD";

  // Skip lookup for private/loopback IPs (dev / Railway health checks)
  const isPrivate =
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

  if (!isPrivate) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2_000);
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: controller.signal,
        headers: { "User-Agent": "GranWatch/1.0" },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json() as { country_code?: string; error?: boolean };
        if (!data.error && data.country_code) {
          tier = getPricingTier(data.country_code);
        }
      }
    } catch {
      // Network error or timeout — default to USD
    }
  }

  return {
    tier,
    variantId: getVariantIdForTier(tier),
    ...TIER_INFO[tier],
  };
}

/** Extract the best client IP from an Express request (handles Railway's proxy). */
export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.ip ?? "";
}
