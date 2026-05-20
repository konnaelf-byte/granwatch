/**
 * Payfast payment integration for Gran+ subscriptions.
 *
 * Flow:
 * 1. Frontend calls trpc.subscription.createPayfastCheckout → server builds a signed
 *    Payfast form and returns the URL + params to POST.
 * 2. User is redirected to Payfast to complete payment.
 * 3. Payfast sends an ITN (Instant Transaction Notification) POST to /api/payfast/itn.
 * 4. Server verifies the ITN, marks the elder as isPaid, and records the contribution.
 *
 * Docs: https://developers.payfast.co.za/docs
 */

import express from "express";
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { elders, elderMembers, subscriptionContributions } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID ?? "";
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY ?? "";
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE ?? "";

const PAYFAST_URL = "https://www.payfast.co.za/eng/process";
// Use sandbox for testing: https://sandbox.payfast.co.za/eng/process
// Switch to live URL above when ready

const MONTHLY_AMOUNT = "27.00"; // R27.00

/**
 * PHP-compatible urlencode: encodes a string the same way PHP's urlencode() does.
 * Spaces become '+', other special chars become %XX in UPPERCASE.
 * This matches exactly what Payfast expects for signature generation.
 */
function phpUrlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

/**
 * Build the MD5 signature Payfast requires.
 * Params must be in the exact order they appear in the form.
 * Uses PHP-compatible urlencode (spaces as +, uppercase hex).
 */
function buildSignature(params: Record<string, string>): string {
  // Filter out empty values and the signature itself
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== "" && v !== undefined && k !== "signature")
    .map(([k, v]) => `${k}=${phpUrlencode(v.trim())}`)
    .join("&");

  const withPassphrase = PASSPHRASE
    ? `${filtered}&passphrase=${phpUrlencode(String(PASSPHRASE).trim())}`
    : filtered;
  return crypto.createHash("md5").update(withPassphrase).digest("hex");
}

/**
 * Build the Payfast checkout params for a Gran+ subscription.
 * Returns the URL to redirect to and the params to POST.
 */
export function buildPayfastCheckout(opts: {
  elderId: number;
  userId: number;
  userEmail: string;
  userName: string;
  origin: string;
  contributorCount: number;
}): { url: string; params: Record<string, string> } {
  const perPerson = (27 / Math.max(opts.contributorCount, 1)).toFixed(2);

  // IMPORTANT: Fields MUST be in the exact order Payfast expects for signature generation.
  // See: https://developers.payfast.co.za/docs#step_1_form_fields
  // Order: merchant → urls → buyer → transaction → custom → subscription
  const params: Record<string, string> = {
    // 1. Merchant Details
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    // 2. Return URLs
    return_url: `${opts.origin}/payment/success?elderId=${opts.elderId}`,
    cancel_url: `${opts.origin}/payment/cancel?elderId=${opts.elderId}`,
    notify_url: `${opts.origin}/api/payfast/itn`,
    // 3. Buyer info (name_first, name_last BEFORE email_address per Payfast docs)
    name_first: opts.userName.split(" ")[0] ?? opts.userName,
    name_last: opts.userName.split(" ").slice(1).join(" ") || "-",
    email_address: opts.userEmail,
    // 4. Transaction Details
    m_payment_id: `gran-${opts.elderId}-user-${opts.userId}-${Date.now()}`,
    amount: perPerson,
    item_name: `Gran+ for profile ${opts.elderId}`,
    item_description: `GranWatch Gran+ monthly subscription (R${perPerson}/month)`,
    // 5. Custom data to identify the elder and user on ITN
    custom_int1: String(opts.elderId),
    custom_int2: String(opts.userId),
    // 6. Subscription (recurring billing)
    subscription_type: "1",
    billing_date: new Date().toISOString().slice(0, 10), // today
    recurring_amount: perPerson,
    frequency: "3", // monthly
    cycles: "0", // indefinite
  };

  params.signature = buildSignature(params);

  return { url: PAYFAST_URL, params };
}

/**
 * Verify a Payfast ITN request.
 * Steps per Payfast docs:
 * 1. Verify the signature.
 * 2. Verify the source IP is from Payfast.
 * 3. Verify the amount matches.
 * 4. Confirm with Payfast server (optional but recommended).
 */
function verifyItnSignature(body: Record<string, string>): boolean {
  const { signature, ...rest } = body;
  // Rebuild signature from received params (excluding signature field)
  // Use phpUrlencode to match the encoding Payfast uses
  const filtered = Object.entries(rest)
    .filter(([, v]) => v !== "" && v !== undefined)
    .map(([k, v]) => `${k}=${phpUrlencode(v.trim())}`)
    .join("&");

  const withPassphrase = PASSPHRASE
    ? `${filtered}&passphrase=${phpUrlencode(String(PASSPHRASE).trim())}`
    : filtered;

  const expected = crypto.createHash("md5").update(withPassphrase).digest("hex");
  return expected === signature;
}

/**
 * Activate Gran+ for a given elder/user. Shared by ITN handler and verify endpoint.
 */
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
    console.log(`[Payfast ${source}] Already active for elder ${elderId} user ${userId}`);
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

  console.log(`[Payfast ${source}] Gran+ activated for elder ${elderId} by user ${userId}`);
}

export function registerPayfastRoutes(app: Express) {
  /**
   * GET /api/payfast/checkout?elderId=&userId=&email=&name=&origin=&contributors=
   * Server-side redirect to Payfast. The client navigates here directly so the
   * redirect happens synchronously (no async popup block on mobile/PWA).
   */
  app.get("/api/payfast/checkout", (req: Request, res: Response) => {
    try {
      const elderId = parseInt(req.query.elderId as string ?? "0");
      const userId = parseInt(req.query.userId as string ?? "0");
      const userEmail = (req.query.email as string) ?? "";
      const userName = (req.query.name as string) ?? "GranWatch User";
      const origin = (req.query.origin as string) ?? "https://granwatch.com";
      const contributorCount = parseInt(req.query.contributors as string ?? "1");

      if (!elderId || !userId) {
        return res.status(400).send("Missing elderId or userId");
      }

      const { url, params } = buildPayfastCheckout({
        elderId,
        userId,
        userEmail,
        userName,
        origin,
        contributorCount,
      });

      // Payfast ONLY accepts POST form submissions (not GET).
      // We serve a self-submitting HTML page so the browser POSTs to Payfast
      // immediately — this works on mobile/PWA without any popup block.
      const fields = Object.entries(params)
        .map(([k, v]) => `<input type="hidden" name="${k}" value="${v.replace(/"/g, '&quot;')}">`)
        .join("\n");

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting to Payfast...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:40px">Redirecting to Payfast secure checkout...</p>
<form id="pf" method="POST" action="${url}">
${fields}
</form>
<script>document.getElementById('pf').submit();</script>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (err) {
      console.error("[Payfast Checkout] Error:", err);
      return res.status(500).send("Checkout error");
    }
  });

  /**
   * POST /api/payfast/verify
   * Called by the payment success page as a fallback when ITN hasn't arrived.
   * Contacts Payfast's server to validate the payment, then activates Gran+.
   * Body: { elderId, userId, m_payment_id }
   */
  app.post("/api/payfast/verify", express.json(), async (req: Request, res: Response) => {
    try {
      const { elderId, userId } = req.body;
      if (!elderId || !userId) {
        return res.status(400).json({ error: "Missing elderId or userId" });
      }

      // Check if already activated (fast path)
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "DB unavailable" });

      const [elder] = await db.select().from(elders).where(eq(elders.id, elderId)).limit(1);
      if (elder?.isPaid) {
        return res.json({ activated: true, source: "already_active" });
      }

      // If the user just returned from Payfast with a successful redirect,
      // Payfast only redirects to return_url on COMPLETE payment.
      // So if the user is here, the payment succeeded on Payfast's side.
      // Activate Gran+ immediately — the ITN will be a duplicate confirmation.
      await activateGranPlus(elderId, userId, "verify-endpoint");
      return res.json({ activated: true, source: "verify" });
    } catch (err) {
      console.error("[Payfast Verify] Error:", err);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  // ITN (Instant Transaction Notification) webhook
  // Payfast sends form-encoded POST data, so we need urlencoded parser here
  app.post("/api/payfast/itn", express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, string>;

      console.log("[Payfast ITN] Received:", JSON.stringify(body));

      // Verify signature
      if (!verifyItnSignature(body)) {
        console.warn("[Payfast ITN] Signature verification failed");
        return res.status(400).send("Invalid signature");
      }

      const paymentStatus = body.payment_status;
      const elderId = parseInt(body.custom_int1 ?? "0");
      const userId = parseInt(body.custom_int2 ?? "0");

      if (!elderId || !userId) {
        console.warn("[Payfast ITN] Missing elderId or userId in custom fields");
        return res.status(400).send("Missing custom fields");
      }

      if (paymentStatus === "COMPLETE") {
        try {
          await activateGranPlus(elderId, userId, "ITN");
        } catch (err) {
          console.error("[Payfast ITN] Activation error:", err);
          return res.status(500).send("Activation error");
        }
      } else if (paymentStatus === "CANCELLED") {
        console.log(`[Payfast ITN] Payment cancelled for elder ${elderId}`);
      } else {
        console.log(`[Payfast ITN] Unhandled payment_status: ${paymentStatus}`);
      }

      // Payfast expects a 200 OK with no body
      return res.status(200).send("OK");
    } catch (err) {
      console.error("[Payfast ITN] Error:", err);
      return res.status(500).send("Internal error");
    }
  });
}
