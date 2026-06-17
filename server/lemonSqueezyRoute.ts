/**
 * Lemon Squeezy payment integration for Gran+ subscriptions.
 *
 * Flow:
 * 1. Frontend calls trpc.subscription.createCheckout → server builds a Lemon Squeezy
 *    checkout URL and returns it.
 * 2. User completes payment on Lemon Squeezy's hosted checkout.
 * 3. Lemon Squeezy sends webhook events to /api/lemonsqueezy/webhook.
 * 4. Server verifies the signature, activates Gran+ for the elder.
 *
 * Docs: https://docs.lemonsqueezy.com/api
 */

import crypto from "crypto";
import express from "express";
import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { elders, elderMembers, subscriptionContributions } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

// ─── Config ──────────────────────────────────────────────────────────────────

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";
const STORE_ID = process.env.LS_STORE_ID ?? "354262";    // Better Creation store
const VARIANT_ID = process.env.LS_VARIANT_ID ?? "1681701"; // Gran+ monthly variant

// ─── Checkout URL builder ─────────────────────────────────────────────────────

/**
 * Build a Lemon Squeezy hosted checkout URL for Gran+.
 * Returns the URL to redirect the user to.
 */
export async function buildLemonSqueezyCheckout(opts: {
  elderId: number;
  userId: number;
  userEmail: string;
  userName: string;
  /** Override the default variant ID (used for regional pricing). */
  variantId?: string;
}): Promise<string> {
  if (!ENV.lemonSqueezyApiKey) throw new Error("LEMONSQUEEZY_API_KEY not set");
  if (!STORE_ID) throw new Error("LS_STORE_ID not set");
  const resolvedVariantId = opts.variantId ?? VARIANT_ID;
  if (!resolvedVariantId) throw new Error("LS_VARIANT_ID not set");

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: opts.userEmail,
          name: opts.userName,
          custom: {
            elder_id: String(opts.elderId),
            user_id: String(opts.userId),
          },
        },
        product_options: {
          redirect_url: `https://granwatch.app/payment/success?elderId=${opts.elderId}`,
        },
      },
      relationships: {
        store: { data: { type: "stores", id: STORE_ID } },
        variant: { data: { type: "variants", id: resolvedVariantId } },
      },
    },
  };

  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ENV.lemonSqueezyApiKey}`,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy checkout failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { data: { attributes: { url: string } } };
  return data.data.attributes.url;
}

// ─── Subscription cancellation ───────────────────────────────────────────────

/**
 * Cancel a Lemon Squeezy subscription immediately.
 * Called on account deletion to prevent billing the deleted user.
 * Silently logs and returns on any error (deletion should proceed regardless).
 */
export async function cancelLemonSqueezySubscription(subscriptionId: string): Promise<void> {
  if (!ENV.lemonSqueezyApiKey) return;
  try {
    const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ENV.lemonSqueezyApiKey}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (res.ok || res.status === 404) {
      console.log(`[LemonSqueezy] Cancelled subscription ${subscriptionId}`);
    } else {
      const body = await res.text().catch(() => "");
      console.warn(`[LemonSqueezy] Cancel subscription ${subscriptionId} returned ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error(`[LemonSqueezy] Failed to cancel subscription ${subscriptionId}:`, err);
  }
}

// ─── Webhook verification ─────────────────────────────────────────────────────

function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!ENV.lemonSqueezyWebhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", ENV.lemonSqueezyWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── Gran+ activation ────────────────────────────────────────────────────────

async function activateGranPlus(elderId: number, userId: number, source: string) {
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
    console.log(`[LemonSqueezy ${source}] Already active for elder ${elderId} user ${userId}`);
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

  console.log(`[LemonSqueezy ${source}] Gran+ activated for elder ${elderId} by user ${userId}`);

  // Fire referral conversion — async, non-blocking
  import("./referralRouter")
    .then(({ applyReferralConversion }) => applyReferralConversion(userId))
    .catch(e => console.error("[Referral] applyConversion failed:", e));
}

async function deactivateGranPlus(elderId: number, userId: number, source: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  await db
    .update(subscriptionContributions)
    .set({ isActive: false })
    .where(and(
      eq(subscriptionContributions.elderId, elderId),
      eq(subscriptionContributions.userId, userId)
    ));

  // Check if any other active contributors remain
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

  console.log(`[LemonSqueezy ${source}] Gran+ deactivated for elder ${elderId} user ${userId}`);
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerLemonSqueezyRoutes(app: Express) {
  /**
   * POST /api/lemonsqueezy/webhook
   * Receives subscription lifecycle events from Lemon Squeezy.
   * Raw body required for signature verification — must be registered
   * BEFORE express.json() middleware.
   */
  app.post(
    "/api/lemonsqueezy/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const signature = req.headers["x-signature"] as string;

      if (!signature) {
        console.warn("[LemonSqueezy Webhook] Missing X-Signature header");
        return res.status(400).send("Missing signature");
      }

      if (!verifyWebhookSignature(req.body as Buffer, signature)) {
        console.warn("[LemonSqueezy Webhook] Signature verification failed");
        return res.status(401).send("Invalid signature");
      }

      let event: { meta: { event_name: string; custom_data?: { elder_id?: string; user_id?: string } }; data: unknown };
      try {
        event = JSON.parse((req.body as Buffer).toString());
      } catch {
        return res.status(400).send("Invalid JSON");
      }

      const eventName = event.meta.event_name;
      const customData = event.meta.custom_data ?? {};
      const elderId = parseInt(customData.elder_id ?? "0");
      const userId = parseInt(customData.user_id ?? "0");

      console.log(`[LemonSqueezy Webhook] Event: ${eventName}, elder: ${elderId}, user: ${userId}`);

      if (!elderId || !userId) {
        console.warn("[LemonSqueezy Webhook] Missing elder_id or user_id in custom_data");
        return res.status(200).send("OK"); // Return 200 to prevent retries
      }

      try {
        switch (eventName) {
          case "subscription_created":
          case "subscription_resumed":
          case "subscription_unpaused":
            await activateGranPlus(elderId, userId, eventName);
            break;

          case "subscription_cancelled":
          case "subscription_expired":
          case "subscription_paused":
            await deactivateGranPlus(elderId, userId, eventName);
            break;

          default:
            console.log(`[LemonSqueezy Webhook] Unhandled event: ${eventName}`);
        }
      } catch (err) {
        console.error("[LemonSqueezy Webhook] Processing error:", err);
        return res.status(500).send("Processing error");
      }

      return res.status(200).send("OK");
    }
  );
}
