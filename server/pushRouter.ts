/**
 * Push notification router — register and unregister FCM device tokens.
 *
 * Native flow (Capacitor):
 * 1. App calls @capacitor/push-notifications to request permission
 * 2. On registration, app receives an FCM token
 * 3. App calls pushToken.register({ token, platform }) to store it server-side
 * 4. Cron job reads tokens per user and sends via Firebase Admin SDK
 * 5. On logout / token refresh, app calls pushToken.unregister({ token })
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { pushTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const pushRouter = router({
  /**
   * Register a device token for the current user.
   * Idempotent — safe to call on every app launch.
   */
  register: protectedProcedure
    .input(z.object({
      token: z.string().min(1).max(512),
      platform: z.enum(["ios", "android", "web"]).default("ios"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Upsert: if the token already exists (possibly for another user after re-install),
      // update the userId so it points to the current user.
      await db
        .insert(pushTokens)
        .values({
          userId: ctx.user.id,
          token: input.token,
          platform: input.platform,
        })
        .onDuplicateKeyUpdate({
          set: { userId: ctx.user.id, platform: input.platform },
        });

      console.log(`[Push] Registered token for user ${ctx.user.id} (${input.platform})`);
      return { success: true };
    }),

  /**
   * Unregister a token — call on logout or when the OS issues a new token.
   */
  unregister: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      await db
        .delete(pushTokens)
        .where(
          and(
            eq(pushTokens.token, input.token),
            eq(pushTokens.userId, ctx.user.id),
          )
        );

      console.log(`[Push] Unregistered token for user ${ctx.user.id}`);
      return { success: true };
    }),
});
