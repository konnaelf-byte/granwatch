/**
 * Gift router — "Send Gran Flowers / a Gift" affiliate actions.
 *
 * Every tap is logged here BEFORE the client opens the partner URL.
 * This gives GranWatch a record of affiliate intents for commission
 * tracking once partner deals are signed (AU, NL, BR contacts).
 *
 * No Gran+ gate — gifting is available to all family members.
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { giftLogs, elderMembers, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const giftRouter = router({

  /**
   * Log a gift-send intent (any family member, no Gran+ required).
   * Call this immediately when the user taps the button, BEFORE opening
   * the partner URL — so we capture the intent even if they close the browser.
   */
  log: protectedProcedure
    .input(z.object({
      elderId: z.number(),
      giftType: z.enum(["flowers", "gift"]),
      partnerName: z.string().max(255).optional(), // filled when named partners are onboarded
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Must be a family member
      const [member] = await db
        .select()
        .from(elderMembers)
        .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
        .limit(1);
      if (!member) throw new Error("You are not a member of this family");

      const [result] = await db.insert(giftLogs).values({
        elderId: input.elderId,
        sentByUserId: ctx.user.id,
        giftType: input.giftType,
        partnerName: input.partnerName ?? null,
      });

      return { id: (result as any).insertId };
    }),

  /**
   * List recent gift logs for an elder (visible to all family members).
   * Returned in descending chronological order, with the sender's name resolved.
   */
  list: protectedProcedure
    .input(z.object({
      elderId: z.number(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Must be a family member
      const [member] = await db
        .select()
        .from(elderMembers)
        .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
        .limit(1);
      if (!member) throw new Error("Not a member of this family");

      const logs = await db
        .select()
        .from(giftLogs)
        .where(eq(giftLogs.elderId, input.elderId))
        .orderBy(desc(giftLogs.sentAt))
        .limit(input.limit);

      // Resolve sender names
      return Promise.all(
        logs.map(async (g) => {
          const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, g.sentByUserId))
            .limit(1);
          return {
            ...g,
            senderName: user?.name ?? "A family member",
          };
        })
      );
    }),
});
