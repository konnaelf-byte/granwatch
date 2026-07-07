/**
 * Gran+ Care Schedule router.
 *
 * Provides medication tracking and doctor appointment management.
 * All procedures are Gran+ gated (elder.isPaid must be true).
 *
 * Medication flow:
 *   Admin adds medications → family members see them → mark "taken" during a visit
 *
 * Appointment flow:
 *   Admin adds upcoming appointments → family sees them → admin marks completed
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { elders, elderMembers, elderMedications, medicationLogs, elderAppointments } from "../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// ─── Helper: assert Gran+ and membership ─────────────────────────────────────

async function assertMember(elderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [elder] = await db.select().from(elders).where(eq(elders.id, elderId)).limit(1);
  if (!elder) throw new Error("Gran profile not found");
  if (!elder.isPaid) throw new Error("Gran+ required for care schedule features");

  const [member] = await db
    .select()
    .from(elderMembers)
    .where(and(eq(elderMembers.elderId, elderId), eq(elderMembers.userId, userId)))
    .limit(1);
  if (!member) throw new Error("You are not a member of this family");

  return { elder, member };
}

async function assertAdmin(elderId: number, userId: number) {
  const { elder, member } = await assertMember(elderId, userId);
  if (member.role !== "admin") throw new Error("Only admins can manage care schedules");
  return { elder, member };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const careRouter = router({

  // ── Medications ────────────────────────────────────────────────────────────

  /** List active medications for an elder (all family members can view). */
  medications: router({

    list: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertMember(input.elderId, ctx.user.id);

        const meds = await db
          .select()
          .from(elderMedications)
          .where(and(
            eq(elderMedications.elderId, input.elderId),
            eq(elderMedications.isActive, true),
          ))
          .orderBy(elderMedications.createdAt);

        // Fetch the last 7 days of logs (today included) so the client can
        // render a per-routine history strip. Today's status keeps its own
        // fields for the action buttons.
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86400000);
        const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

        const weekLogs = meds.length > 0
          ? await db
            .select()
            .from(medicationLogs)
            .where(and(
              eq(medicationLogs.elderId, input.elderId),
              gte(medicationLogs.takenAt, weekStart),
              lte(medicationLogs.takenAt, todayEnd),
            ))
          : [];

        const dayKey = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        return meds.map(med => {
          const todayLog = weekLogs.find(l =>
            l.medicationId === med.id && l.takenAt >= todayStart && l.takenAt <= todayEnd
          );
          // Oldest → newest, 7 entries ending today. Last-write-wins per day
          // (logToday upserts, so there's at most one log per med per day).
          const week = Array.from({ length: 7 }, (_, i) => {
            const day = new Date(weekStart.getTime() + i * 86400000);
            const key = dayKey(day);
            const log = weekLogs.find(l => l.medicationId === med.id && dayKey(l.takenAt) === key);
            return { date: key, status: log?.status ?? null };
          });
          return {
            ...med,
            todayStatus: todayLog?.status ?? null,
            todayLogId: todayLog?.id ?? null,
            week,
          };
        });
      }),

    /** Add a medication (admin only). */
    add: protectedProcedure
      .input(z.object({
        elderId: z.number(),
        name: z.string().min(1).max(255),
        dosage: z.string().max(100).optional(),
        frequency: z.enum(["daily", "twice_daily", "weekly", "as_needed"]).default("daily"),
        timeOfDay: z.enum(["am", "midday", "pm"]).optional(),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertAdmin(input.elderId, ctx.user.id);

        const [result] = await db.insert(elderMedications).values({
          elderId: input.elderId,
          name: input.name,
          dosage: input.dosage ?? null,
          frequency: input.frequency,
          timeOfDay: input.timeOfDay ?? null,
          notes: input.notes ?? null,
          isActive: true,
          createdByUserId: ctx.user.id,
        });

        return { id: result.insertId };
      }),

    /** Deactivate (soft-delete) a medication (admin only). */
    remove: protectedProcedure
      .input(z.object({ medicationId: z.number(), elderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertAdmin(input.elderId, ctx.user.id);

        await db
          .update(elderMedications)
          .set({ isActive: false })
          .where(and(
            eq(elderMedications.id, input.medicationId),
            eq(elderMedications.elderId, input.elderId),
          ));
      }),

    /** Log a medication as taken or missed today (any family member). */
    logToday: protectedProcedure
      .input(z.object({
        medicationId: z.number(),
        elderId: z.number(),
        status: z.enum(["taken", "missed"]).default("taken"),
        notes: z.string().max(300).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertMember(input.elderId, ctx.user.id);

        // Upsert: if already logged today, update the status
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const [existing] = await db
          .select()
          .from(medicationLogs)
          .where(and(
            eq(medicationLogs.medicationId, input.medicationId),
            eq(medicationLogs.elderId, input.elderId),
            gte(medicationLogs.takenAt, todayStart),
            lte(medicationLogs.takenAt, todayEnd),
          ))
          .limit(1);

        if (existing) {
          await db
            .update(medicationLogs)
            .set({ status: input.status, loggedByUserId: ctx.user.id, notes: input.notes ?? null })
            .where(eq(medicationLogs.id, existing.id));
          return { id: existing.id };
        }

        const [result] = await db.insert(medicationLogs).values({
          medicationId: input.medicationId,
          elderId: input.elderId,
          loggedByUserId: ctx.user.id,
          takenAt: new Date(),
          status: input.status,
          notes: input.notes ?? null,
        });
        return { id: result.insertId };
      }),

    /** Recent 7-day compliance log for all meds. */
    recentLogs: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertMember(input.elderId, ctx.user.id);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return db
          .select()
          .from(medicationLogs)
          .where(and(
            eq(medicationLogs.elderId, input.elderId),
            gte(medicationLogs.takenAt, sevenDaysAgo),
          ))
          .orderBy(desc(medicationLogs.takenAt));
      }),
  }),

  // ── Appointments ───────────────────────────────────────────────────────────

  appointments: router({

    /** List all appointments (upcoming first, then recent completed). */
    list: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertMember(input.elderId, ctx.user.id);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return db
          .select()
          .from(elderAppointments)
          .where(and(
            eq(elderAppointments.elderId, input.elderId),
            gte(elderAppointments.scheduledAt, thirtyDaysAgo),
          ))
          .orderBy(elderAppointments.scheduledAt);
      }),

    /** Add a new appointment (admin only). */
    add: protectedProcedure
      .input(z.object({
        elderId: z.number(),
        title: z.string().min(1).max(255),
        doctorName: z.string().max(255).optional(),
        location: z.string().max(255).optional(),
        scheduledAt: z.string(), // ISO string
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertAdmin(input.elderId, ctx.user.id);

        const [result] = await db.insert(elderAppointments).values({
          elderId: input.elderId,
          title: input.title,
          doctorName: input.doctorName ?? null,
          location: input.location ?? null,
          scheduledAt: new Date(input.scheduledAt),
          notes: input.notes ?? null,
          createdByUserId: ctx.user.id,
        });

        return { id: result.insertId };
      }),

    /** Mark an appointment as completed (any family member). */
    complete: protectedProcedure
      .input(z.object({ appointmentId: z.number(), elderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertMember(input.elderId, ctx.user.id);

        await db
          .update(elderAppointments)
          .set({ completedAt: new Date() })
          .where(and(
            eq(elderAppointments.id, input.appointmentId),
            eq(elderAppointments.elderId, input.elderId),
          ));
      }),

    /** Remove an appointment (admin only). */
    remove: protectedProcedure
      .input(z.object({ appointmentId: z.number(), elderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await assertAdmin(input.elderId, ctx.user.id);

        await db
          .delete(elderAppointments)
          .where(and(
            eq(elderAppointments.id, input.appointmentId),
            eq(elderAppointments.elderId, input.elderId),
          ));
      }),
  }),
});
