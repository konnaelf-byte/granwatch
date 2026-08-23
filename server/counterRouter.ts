/**
 * Gran+ Custom Counters router.
 *
 * "One or two custom counters" per gran (Konstand, 2026-08-10): any name or
 * emoji, any interval in days, shown as a horizontal drain bar (distinct from
 * the main status ring), overdue push via nightly cron.
 *
 * Scope rules:
 *   family  — visible to the whole family, anyone logs, creator/admin removes.
 *   private — visible ONLY to ownerUserId; only the owner logs/removes.
 *             Private counters and their logs NEVER appear in the family feed
 *             and are never returned to other members (Konstand's call).
 *
 * Caps (v1): 2 family counters per elder + 2 private counters per user per elder.
 * All procedures Gran+ gated, same as careRouter.
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { elders, elderMembers, elderCounters, counterLogs, users } from "../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { hasGranPlus, granPlusLockedError } from "./entitlement";

// ─── Helper: assert Gran+ and membership ─────────────────────────────────────

async function assertMember(elderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [elder] = await db.select().from(elders).where(eq(elders.id, elderId)).limit(1);
  if (!elder) throw new Error("Gran profile not found");
  if (!hasGranPlus(elder)) throw granPlusLockedError(elder, "custom counters");

  const [member] = await db
    .select()
    .from(elderMembers)
    .where(and(eq(elderMembers.elderId, elderId), eq(elderMembers.userId, userId)))
    .limit(1);
  if (!member) throw new Error("You are not a member of this family");

  return { elder, member };
}

/** Fetch a counter and verify the caller may see it (private → owner only). */
async function assertCounterAccess(counterId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [counter] = await db
    .select()
    .from(elderCounters)
    .where(and(eq(elderCounters.id, counterId), eq(elderCounters.isActive, true)))
    .limit(1);
  if (!counter) throw new Error("Counter not found");

  const { member } = await assertMember(counter.elderId, userId);
  if (counter.scope === "private" && counter.ownerUserId !== userId) {
    throw new Error("This counter is private");
  }
  return { counter, member };
}

const CAP_FAMILY = 2;        // per elder
const CAP_PRIVATE = 2;       // per user per elder

// ─── Router ───────────────────────────────────────────────────────────────────

export const counterRouter = router({

  /**
   * List counters visible to the caller: all family-scope counters plus the
   * caller's OWN private ones. Each comes back with lastLog info and
   * daysSince so the client can draw the drain bar without extra round trips.
   */
  list: protectedProcedure
    .input(z.object({ elderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await assertMember(input.elderId, ctx.user.id);

      const all = await db
        .select()
        .from(elderCounters)
        .where(and(
          eq(elderCounters.elderId, input.elderId),
          eq(elderCounters.isActive, true),
        ))
        .orderBy(elderCounters.createdAt);

      // Privacy filter: other users' private counters never leave the server.
      const visible = all.filter(c =>
        c.scope === "family" || c.ownerUserId === ctx.user.id
      );
      if (visible.length === 0) return [];

      const counterIds = visible.map(c => c.id);
      const logs = await db
        .select()
        .from(counterLogs)
        .where(inArray(counterLogs.counterId, counterIds))
        .orderBy(desc(counterLogs.loggedAt));

      const loggerIds = Array.from(new Set(logs.map(l => l.loggedByUserId)));
      const loggers = loggerIds.length > 0
        ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, loggerIds))
        : [];
      const loggerName = (id: number) => loggers.find(u => u.id === id)?.name ?? "a family member";

      const now = Date.now();
      return visible.map(c => {
        const last = logs.find(l => l.counterId === c.id) ?? null; // logs sorted desc
        // No log yet → measure from creation so a fresh counter starts green.
        const sinceMs = now - (last ? last.loggedAt.getTime() : c.createdAt.getTime());
        const daysSince = Math.floor(sinceMs / 86400000);
        return {
          ...c,
          daysSince,
          lastLog: last
            ? { loggedAt: last.loggedAt, byName: loggerName(last.loggedByUserId), note: last.note }
            : null,
        };
      });
    }),

  /** Recent history for one counter (the "useful log"). */
  logs: protectedProcedure
    .input(z.object({ counterId: z.number(), limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await assertCounterAccess(input.counterId, ctx.user.id);

      const rows = await db
        .select()
        .from(counterLogs)
        .where(eq(counterLogs.counterId, input.counterId))
        .orderBy(desc(counterLogs.loggedAt))
        .limit(input.limit);

      const loggerIds = Array.from(new Set(rows.map(l => l.loggedByUserId)));
      const loggers = loggerIds.length > 0
        ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, loggerIds))
        : [];
      return rows.map(l => ({
        id: l.id,
        loggedAt: l.loggedAt,
        note: l.note,
        byName: loggers.find(u => u.id === l.loggedByUserId)?.name ?? "a family member",
      }));
    }),

  /** Create a counter. Caps: 2 family per elder, 2 private per user per elder. */
  add: protectedProcedure
    .input(z.object({
      elderId: z.number(),
      name: z.string().trim().min(1).max(30),
      emoji: z.string().trim().min(1).max(16).default("💚"),
      intervalDays: z.number().int().min(1).max(365),
      monthlyDay: z.number().int().min(1).max(31).nullable().optional(),
      scope: z.enum(["private", "family"]).default("family"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await assertMember(input.elderId, ctx.user.id);

      const existing = await db
        .select()
        .from(elderCounters)
        .where(and(
          eq(elderCounters.elderId, input.elderId),
          eq(elderCounters.isActive, true),
        ));

      if (input.scope === "family") {
        const familyCount = existing.filter(c => c.scope === "family").length;
        if (familyCount >= CAP_FAMILY) {
          throw new Error(`A family can have up to ${CAP_FAMILY} shared counters for now — remove one first`);
        }
      } else {
        const mine = existing.filter(c => c.scope === "private" && c.ownerUserId === ctx.user.id).length;
        if (mine >= CAP_PRIVATE) {
          throw new Error(`You can have up to ${CAP_PRIVATE} private counters for now — remove one first`);
        }
      }

      await db.insert(elderCounters).values({
        elderId: input.elderId,
        name: input.name,
        emoji: input.emoji,
        intervalDays: input.intervalDays,
        monthlyDay: input.monthlyDay ?? null,
        scope: input.scope,
        ownerUserId: input.scope === "private" ? ctx.user.id : null,
        createdByUserId: ctx.user.id,
      });
      return { ok: true };
    }),

  /**
   * Log a counter as done. Private → owner only. Resets the drain bar and
   * (via lastNotifiedAt comparison in cron) re-arms the overdue notification.
   * Deliberately does NOT write to visits/notifications — no feed entries.
   */
  log: protectedProcedure
    .input(z.object({ counterId: z.number(), note: z.string().trim().max(255).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { counter } = await assertCounterAccess(input.counterId, ctx.user.id);

      await db.insert(counterLogs).values({
        counterId: counter.id,
        elderId: counter.elderId,
        loggedByUserId: ctx.user.id,
        note: input.note ?? null,
      });
      return { ok: true };
    }),

  /**
   * Edit a counter's name / emoji / interval (scope is fixed after creation —
   * flipping family↔private would have privacy implications for existing logs).
   * Same permission as remove: family → creator or an admin; private → owner only.
   */
  update: protectedProcedure
    .input(z.object({
      counterId: z.number(),
      name: z.string().trim().min(1).max(30),
      emoji: z.string().trim().min(1).max(16),
      intervalDays: z.number().int().min(1).max(365),
      monthlyDay: z.number().int().min(1).max(31).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { counter, member } = await assertCounterAccess(input.counterId, ctx.user.id);

      const allowed = counter.scope === "private"
        ? counter.ownerUserId === ctx.user.id
        : counter.createdByUserId === ctx.user.id || member.role === "admin";
      if (!allowed) throw new Error("Only the person who created this counter (or an admin) can edit it");

      await db
        .update(elderCounters)
        .set({ name: input.name, emoji: input.emoji, intervalDays: input.intervalDays, monthlyDay: input.monthlyDay ?? null })
        .where(eq(elderCounters.id, input.counterId));
      return { ok: true };
    }),

  /**
   * Soft-delete a counter (isActive=false; history kept).
   * family → creator or an admin; private → owner only.
   */
  remove: protectedProcedure
    .input(z.object({ counterId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { counter, member } = await assertCounterAccess(input.counterId, ctx.user.id);

      const allowed = counter.scope === "private"
        ? counter.ownerUserId === ctx.user.id
        : counter.createdByUserId === ctx.user.id || member.role === "admin";
      if (!allowed) throw new Error("Only the person who created this counter (or an admin) can remove it");

      await db
        .update(elderCounters)
        .set({ isActive: false })
        .where(eq(elderCounters.id, input.counterId));
      return { ok: true };
    }),
});
