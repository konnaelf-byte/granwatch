/**
 * RevenueCat native in-app purchase integration for Gran+.
 *
 * Native iOS/Android only. Web users continue to pay via Lemon Squeezy
 * (see GranPlusModal + server/lemonSqueezyRoute.ts). All purchase UI in the
 * native app must go through Apple/Google IAP, which RevenueCat brokers.
 *
 * Flow:
 *  1. initRevenueCat() is called once after sign-in with the Clerk user ID.
 *  2. purchaseGranPlus(elderId) fetches the Gran+ offering, presents the
 *     native purchase sheet, and — on success — tells the server to verify
 *     the entitlement and activate Gran+ (trpc.revenueCat.activateNative).
 *  3. restorePurchases() re-syncs an existing entitlement with the server.
 *
 * Product identifier:     "gran_plus_monthly"
 * Entitlement identifier: "gran_plus"
 */

import {
  Purchases,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { currentPlatform, isNativeApp } from "./platform";

const ENTITLEMENT_ID = "gran_plus";
const PRODUCT_ID = "gran_plus_monthly";

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;

let configured = false;

/** Resolve the correct platform API key, or null on web/unsupported. */
function resolveApiKey(): string | null {
  if (currentPlatform === "ios") return IOS_KEY ?? null;
  if (currentPlatform === "android") return ANDROID_KEY ?? null;
  return null;
}

/**
 * Configure the RevenueCat SDK with the Clerk user ID as the appUserID.
 * Safe to call multiple times — only configures once. No-op on web.
 */
export async function initRevenueCat(clerkUserId: string): Promise<void> {
  if (!isNativeApp || configured) return;

  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.warn(`[RevenueCat] No API key configured for platform "${currentPlatform}"`);
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey, appUserID: clerkUserId });
    configured = true;
    console.log(`[RevenueCat] Configured for user ${clerkUserId} on ${currentPlatform}`);
  } catch (err) {
    console.error("[RevenueCat] configure failed:", err);
  }
}

/** Fetch the Gran+ offering, or null if none is available. */
export async function getGranPlusOffering(): Promise<PurchasesOffering | null> {
  const { current } = await Purchases.getOfferings();
  return current ?? null;
}

/** Find the Gran+ package within an offering (by product id, falling back to first). */
function findGranPlusPackage(offering: PurchasesOffering): PurchasesPackage | null {
  const byProduct = offering.availablePackages.find(
    (p) => p.product.identifier === PRODUCT_ID
  );
  return byProduct ?? offering.availablePackages[0] ?? null;
}

/**
 * Present the native purchase sheet for Gran+ and, on success, activate
 * the subscription server-side via the provided callback.
 *
 * @param elderId    The elder to attach the subscription to.
 * @param activate   Server activation callback (wraps trpc.revenueCat.activateNative).
 */
export async function purchaseGranPlus(
  elderId: number,
  activate: (input: { elderId: number; revenueCatUserId: string }) => Promise<void>
): Promise<void> {
  if (!isNativeApp) throw new Error("Native purchases are only available in the app.");
  if (!configured) throw new Error("RevenueCat is not configured yet.");

  // Tag the subscriber so the webhook can route lifecycle events to the
  // correct elder/user even when no client session is present.
  const { customerInfo } = await Purchases.getCustomerInfo();
  const revenueCatUserId = customerInfo.originalAppUserId;

  await Purchases.setAttributes({
    $elderId: String(elderId),
    $userId: revenueCatUserId,
  });

  const offering = await getGranPlusOffering();
  if (!offering) throw new Error("Gran+ is not available right now. Please try again later.");

  const pkg = findGranPlusPackage(offering);
  if (!pkg) throw new Error("Gran+ subscription package not found.");

  const { customerInfo: postPurchase } = await Purchases.purchasePackage({
    aPackage: pkg,
  });

  const isActive = postPurchase.entitlements.active[ENTITLEMENT_ID] !== undefined;
  if (!isActive) {
    throw new Error("Purchase did not activate Gran+. Please contact support.");
  }

  // Verify + persist server-side (RevenueCat REST verification on the backend).
  await activate({ elderId, revenueCatUserId });
}

/**
 * Restore previous purchases and re-sync the Gran+ entitlement with the
 * server. Used by the "Restore purchases" link.
 *
 * @param elderId   Elder to re-activate against.
 * @param activate  Server activation callback.
 * @returns true if an active Gran+ entitlement was found and synced.
 */
export async function restorePurchases(
  elderId: number,
  activate: (input: { elderId: number; revenueCatUserId: string }) => Promise<void>
): Promise<boolean> {
  if (!isNativeApp) throw new Error("Restore is only available in the app.");
  if (!configured) throw new Error("RevenueCat is not configured yet.");

  const { customerInfo } = await Purchases.restorePurchases();
  const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

  if (isActive) {
    await activate({ elderId, revenueCatUserId: customerInfo.originalAppUserId });
  }

  return isActive;
}

/** Check whether the current user has an active "gran_plus" entitlement. */
export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!isNativeApp || !configured) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (err) {
    console.error("[RevenueCat] getCustomerInfo failed:", err);
    return false;
  }
}
