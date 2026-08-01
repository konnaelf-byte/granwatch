/**
 * Gran+ entitlement — single place that answers "does this elder have Gran+?"
 *
 * Model (2026-07-31):
 * - Every new elder profile starts a free trial: full Gran+ for TRIAL_DAYS.
 *   No card, no opt-in button — the trial IS the default experience.
 * - Entitlement = isPaid (real payment via Lemon Squeezy / RevenueCat)
 *   OR trialEndsAt in the future.
 * - Trial expiry LOCKS Gran+ endpoints; it NEVER deletes data. Subscribing
 *   at any point (including mid-trial) sets isPaid and everything reopens.
 * - Clients: presentElder() aliases the effective entitlement onto `isPaid`
 *   so frozen native bundles (build 12) unlock trial features with zero
 *   client changes. New clients read `actuallyPaid` / `trialDaysLeft` to
 *   render the countdown badge.
 */

export const TRIAL_DAYS = 180; // phase 1: 6 months; later 90, then 30

type EntitlementFields = { isPaid: boolean; trialEndsAt: Date | null };

export function isTrialActive(e: EntitlementFields): boolean {
  return !e.isPaid && !!e.trialEndsAt && e.trialEndsAt.getTime() > Date.now();
}

export function hasGranPlus(e: EntitlementFields): boolean {
  return e.isPaid || (!!e.trialEndsAt && e.trialEndsAt.getTime() > Date.now());
}

export function isTrialExpired(e: EntitlementFields): boolean {
  return !e.isPaid && !!e.trialEndsAt && e.trialEndsAt.getTime() <= Date.now();
}

export function trialDaysLeft(e: EntitlementFields): number | null {
  if (!isTrialActive(e)) return null;
  return Math.max(1, Math.ceil((e.trialEndsAt!.getTime() - Date.now()) / 86_400_000));
}

export function newTrialEnd(): Date {
  return new Date(Date.now() + TRIAL_DAYS * 86_400_000);
}

/**
 * Error for a locked Gran+ endpoint. Distinguishes "trial ended" (warm,
 * data-is-safe message) from "requires Gran+".
 */
export function granPlusLockedError(e: EntitlementFields, feature: string): Error {
  if (isTrialExpired(e)) {
    return new Error(
      `Your free Gran+ trial has ended. All your ${feature} and history are safely stored — subscribe to Gran+ to pick up exactly where you left off.`
    );
  }
  return new Error(`${feature} require Gran+`);
}

/**
 * Shape an elder row for client responses: `isPaid` becomes the EFFECTIVE
 * entitlement (so old native bundles unlock during trial), while
 * `actuallyPaid`, `trialActive` and `trialDaysLeft` let new clients render
 * trial UI (countdown badge, "included free for 6 months" copy).
 */
export function presentElder<T extends EntitlementFields>(elder: T) {
  return {
    ...elder,
    isPaid: hasGranPlus(elder),
    actuallyPaid: elder.isPaid,
    trialActive: isTrialActive(elder),
    trialDaysLeft: trialDaysLeft(elder),
  };
}
