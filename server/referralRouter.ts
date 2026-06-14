/**
 * Referral program — generate codes, track signups, apply rewards.
 *
 * Flow:
 * 1. Any authenticated user calls referral.getMyCode → gets (or creates) their referral code
 * 2. They share granwatch.app/join?ref=CODE
 * 3. New user signs up → client calls referral.recordSignup with the code
 * 4. When that new user subscribes to Gran+ → Lemon Squeezy webhook calls applyConversion
 * 5. Referrer gets 1 month free applied to their next billing cycle (via LS API)
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { referrals, referralSignups, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/** Generate a human-friendly 8-character referral code */
function generateReferralCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5)
    .padEnd(3, "X");
  const suffix = Math.floor(Math.random() * 900 + 100).toString();
  return `${prefix}${suffix}`;
}

/** Ensure uniqueness with up to 10 retries */
async function generateUniqueCode(db: ReturnType<typeof import("drizzle-orm/mysql2").drizzle>, name: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode(name);
    const [existing] = await db.select().from(referrals).where(eq(referrals.code, code)).limit(1);
    if (!existing) return code;
  }
  // Fallback: pure random 8-char code
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const referralRouter = router({
  /**
   * Get (or lazily create) the current user's referral code.
   * Returns: { code, signupCount, convertedCount, shareUrl }
   */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Return existing code if already generated
    const [existing] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.userId, ctx.user.id))
      .limit(1);

    if (existing) {
      return {
        code: existing.code,
        signupCount: existing.signupCount,
        convertedCount: existing.convertedCount,
        shareUrl: `https://granwatch.app/?ref=${existing.code}`,
      };
    }

    // Create a new code for this user
    const code = await generateUniqueCode(db as any, ctx.user.name ?? "GRAN");
    await db.insert(referrals).values({
      userId: ctx.user.id,
      code,
    });

    return {
      code,
      signupCount: 0,
      convertedCount: 0,
      shareUrl: `https://granwatch.app/?ref=${code}`,
    };
  }),

  /**
   * Called by the frontend when a new user arrives via a referral link.
   * Records the signup against the code. Called once per new user session.
   */
  /**
   * Called after a new user signs in with a referral code in sessionStorage.
   * The server derives the userId from ctx (no client-side userId needed).
   * Safe to call multiple times — idempotent.
   */
  recordSignup: protectedProcedure
    .input(z.object({ code: z.string().max(16) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Don't let users refer themselves
      const [referral] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.code, input.code.toUpperCase()))
        .limit(1);
      if (!referral) return { success: false };
      if (referral.userId === ctx.user.id) return { success: false }; // self-referral

      // Idempotency — don't double-record
      const [existingSignup] = await db
        .select()
        .from(referralSignups)
        .where(and(
          eq(referralSignups.referralCode, referral.code),
          eq(referralSignups.newUserId, ctx.user.id)
        ))
        .limit(1);
      if (existingSignup) return { success: true };

      await db.insert(referralSignups).values({
        referralCode: referral.code,
        newUserId: ctx.user.id,
      });

      await db
        .update(referrals)
        .set({ signupCount: referral.signupCount + 1 })
        .where(eq(referrals.id, referral.id));

      console.log(`[Referral] User ${ctx.user.id} signed up via code ${referral.code} (referrer userId=${referral.userId})`);
      return { success: true };
    }),

});

/**
 * Called internally when a referred user subscribes to Gran+.
 * Marks the referral as converted and logs the reward for the referrer.
 * Called from lemonSqueezyRoute.ts on subscription activation — non-blocking.
 */
export async function applyReferralConversion(newUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find unconverted signup for this user
  const [signup] = await db
    .select()
    .from(referralSignups)
    .where(and(
      eq(referralSignups.newUserId, newUserId),
      eq(referralSignups.converted, false)
    ))
    .limit(1);
  if (!signup) return;

  // Mark as converted
  await db
    .update(referralSignups)
    .set({ converted: true, rewardAppliedAt: new Date() })
    .where(eq(referralSignups.id, signup.id));

  // Increment referrer's converted count
  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.code, signup.referralCode))
    .limit(1);
  if (!referral) return;

  await db
    .update(referrals)
    .set({ convertedCount: referral.convertedCount + 1 })
    .where(eq(referrals.id, referral.id));

  // TODO Phase 2: call LS API to apply 1-month free to referrer's subscription
  console.log(
    `[Referral] User ${newUserId} converted via code ${signup.referralCode}. ` +
    `Referrer userId=${referral.userId} has earned 1 month free (apply in LS dashboard or automate).`
  );
}
