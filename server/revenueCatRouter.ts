/**
 * RevenueCat native in-app purchase integration for Gran+ (iOS + Android).
 *
 * Web users continue to pay via Lemon Squeezy (lemonSqueezyRoute.ts). This
 * module handles the native path only.
 *
 * Flow:
 *  1. Client completes a native purchase via RevenueCat (client/src/utils/iap.ts).
 *  2. Client calls trpc.revenueCat.activateNative — the server verifies the
 *     entitlement against the RevenueCat REST API, then flips elders.isPaid
 *     and records a subscriptionContributions row.
 *  3. RevenueCat sends lifecycle webhooks to POST /api/revenuecat/webhook
 *     (verified via REVENUECAT_WEBHOOK_AUTH_HEADER). These activate/deactivate
 *     Gran+ for renewals, cancellations and expirations.
 *
 * Subscriber attributes set client-side: $elderId, $userId.
 * Entitlement identifier: "gran_plus".
 *
 * Docs: https://www.revenuecat.com/docs/api-v1
 */

import express from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { elders, elderMembers, subscriptionContributions } from "../drizzle/schema";

// ─── Config ──────────────────────────────────────────────────────────────────

const RC_API_BASE = "https://api.revenuecat.com/v1";
const ENTITLEMENT_ID = "gran_plus";

// RevenueCat webhook event types we act on.
const ACTIVATE_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"]);
const DEACTIVATE_EVENTS = new Set(["CANCELLATION", "EXPIRATION"]);

// ─── RevenueCat REST verification ──────────────────────────────────────────────

interface RevenueCatSubscriber {
  subscriber: {
    entitlements: Record<string, { expires_date: string | null }>;
    subscriber_attributes?: Record<string, { value: string }>;
  };
}

/**
 * Fetch a subscriber from RevenueCat and report whether the gran_plus
 * entitlement is currently active (not expired).
 */
async function verifyEntitlementActive(revenueCatUserId: string): Promise<boolean> {
  if (!ENV.revenueCatSecretKey) throw new Error("REVENUECAT_SECRET_API_KEY not set");

  const res = await fetch(`${RC_API_BASE}/subscribers/${encodeURIComponent(revenueCatUserId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ENV.revenueCatSecretKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RevenueCat subscriber lookup failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as RevenueCatSubscriber;
  const entitlement = data.subscriber.entitlements?.[ENTITLEMENT_ID];
  if (!entitlement) return false;

  // expires_date null = lifetime; otherwise must be in the future.
  if (entitlement.expires_date === null) return true;
  return new Date(entitlement.expires_date).getTime() > Date.now();
}

// ─── Gran+ activation / deactivation ───────────────────────────────────────────
// Mirrors the Lemon Squeezy helpers so both payment paths behave identically.

async function activateGranPlus(elderId: number, userId: number, source: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [existing] = await db
    .select()
    .from(subscriptionContributions)
    .where(and(
      eq(subscriptionContributions.elderId, elderId),
      eq(subscriptionContributions.userId, userId)
    ))
    .limit(1);

  if (existing?.isActive) {
    console.log(`[RevenueCat ${source}] Already active for elder ${elderId} user ${userId}`);
    return;
  }

  await db.update(elders).set({ isPaid: true }).where(eq(elders.id, elderId));

  if (existing) {
    await db
      .update(subscriptionContributions)
      .set({ isActive: true })
      .where(eq(subscriptionContributions.id, existing.id));
  } else {
    await db.insert(subscriptionContributions).values({
      elderId,
      userId,
      isActive: true,
    });
  }

  console.log(`[RevenueCat ${source}] Gran+ activated for elder ${elderId} by user ${userId}`);

  // Fire referral conversion — async, non-blocking (matches LS behaviour).
  import("./referralRouter")
    .then(({ applyReferralConversion }) => applyReferralConversion(userId))
    .catch((e) => console.error("[Referral] applyConversion failed:", e));
}

async function deactivateGranPlus(elderId: number, userId: number, source: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  await db
    .update(subscriptionContributions)
    .set({ isActive: false })
    .where(and(
      eq(subscriptionContributions.elderId, elderId),
      eq(subscriptionContributions.userId, userId)
    ));

  // Only drop the elder's paid status when no active contributors remain.
  const activeContribs = await db
    .select()
    .from(subscriptionContributions)
    .where(and(
      eq(subscriptionContributions.elderId, elderId),
      eq(subscriptionContributions.isActive, true)
    ));

  if (activeContribs.length === 0) {
    await db.update(elders).set({ isPaid: false }).where(eq(elders.id, elderId));
  }

  console.log(`[RevenueCat ${source}] Gran+ deactivated for elder ${elderId} user ${userId}`);
}

// ─── tRPC router ───────────────────────────────────────────────────────────────

export const revenueCatRouter = router({
  /**
   * Activate Gran+ after a successful native purchase. Verifies the
   * entitlement against the RevenueCat REST API before flipping any flags.
   */
  activateNative: protectedProcedure
    .input(z.object({
      elderId: z.number(),
      revenueCatUserId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Caller must be a member of the elder's family.
      const [membership] = await db
        .select()
        .from(elderMembers)
        .where(and(
          eq(elderMembers.elderId, input.elderId),
          eq(elderMembers.userId, ctx.user.id)
        ))
        .limit(1);
      if (!membership) throw new Error("Not a member of this elder's family");

      // Verify the purchase actually granted the entitlement before trusting it.
      const isActive = await verifyEntitlementActive(input.revenueCatUserId);
      if (!isActive) throw new Error("No active Gran+ entitlement found for this purchase.");

      await activateGranPlus(input.elderId, ctx.user.id, "activateNative");
      return { success: true } as const;
    }),
});

// ─── Webhook handler ───────────────────────────────────────────────────────────

interface RevenueCatWebhookEvent {
  event: {
    type: string;
    app_user_id?: string;
    original_app_user_id?: string;
    subscriber_attributes?: Record<string, { value: string }>;
  };
}

/**
 * Express handler for RevenueCat webhooks.
 *
 * RevenueCat is configured (in the dashboard) to send an Authorization header
 * matching REVENUECAT_WEBHOOK_AUTH_HEADER. We reject anything that doesn't match.
 *
 * The elder and user IDs travel as subscriber attributes ($elderId / $userId)
 * set client-side before purchase.
 */
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  const expected = ENV.revenueCatWebhookAuthHeader;
  if (!expected) {
    console.warn("[RevenueCat Webhook] REVENUECAT_WEBHOOK_AUTH_HEADER not set — rejecting");
    res.status(500).send("Webhook auth not configured");
    return;
  }

  const provided = req.headers["authorization"];
  if (provided !== expected) {
    console.warn("[RevenueCat Webhook] Authorization header mismatch");
    res.status(401).send("Unauthorized");
    return;
  }

  let payload: RevenueCatWebhookEvent;
  try {
    payload = (typeof req.body === "object" ? req.body : JSON.parse(String(req.body))) as RevenueCatWebhookEvent;
  } catch {
    res.status(400).send("Invalid JSON");
    return;
  }

  const event = payload.event;
  if (!event?.type) {
    res.status(400).send("Missing event type");
    return;
  }

  const attrs = event.subscriber_attributes ?? {};
  const elderId = parseInt(attrs["$elderId"]?.value ?? "0");
  // $userId carries the RevenueCat app user id (the Clerk id); resolve to our DB user.
  const clerkUserId = attrs["$userId"]?.value ?? event.original_app_user_id ?? event.app_user_id ?? "";

  console.log(`[RevenueCat Webhook] Event: ${event.type}, elder: ${elderId}, rcUser: ${clerkUserId}`);

  if (!elderId || !clerkUserId) {
    console.warn("[RevenueCat Webhook] Missing $elderId or $userId attribute");
    res.status(200).send("OK"); // 200 to stop retries — nothing actionable.
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Resolve the RevenueCat/Clerk user id to our internal numeric user id.
    const { users } = await import("../drizzle/schema");
    const [user] = await db.select().from(users).where(eq(users.openId, clerkUserId)).limit(1);
    if (!user) {
      console.warn(`[RevenueCat Webhook] No user found for openId ${clerkUserId}`);
      res.status(200).send("OK");
      return;
    }

    if (ACTIVATE_EVENTS.has(event.type)) {
      await activateGranPlus(elderId, user.id, `webhook:${event.type}`);
    } else if (DEACTIVATE_EVENTS.has(event.type)) {
      await deactivateGranPlus(elderId, user.id, `webhook:${event.type}`);
    } else {
      console.log(`[RevenueCat Webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("[RevenueCat Webhook] Processing error:", err);
    res.status(500).send("Processing error");
    return;
  }

  res.status(200).send("OK");
}

/**
 * Register the RevenueCat webhook route.
 * RevenueCat sends JSON; we parse it locally so registration order relative to
 * the global json() middleware doesn't matter.
 */
export function registerRevenueCatRoutes(app: Express): void {
  app.post("/api/revenuecat/webhook", express.json({ type: "*/*", limit: "1mb" }), webhookHandler);
}
