import { COOKIE_NAME, MONTHLY_COST_CENTS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  elders, elderMembers, visits, plannedVisits,
  subscriptionContributions, notifications, users
} from "../drizzle/schema";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { cancelLemonSqueezySubscription } from "./lemonSqueezyRoute";
import { storageDelete } from "./storage";

/**
 * Extract the R2 storage key from a photo URL.
 * Handles both public URL format (https://pub-xxx.r2.dev/key) and
 * legacy presigned URLs (https://accountId.r2.cloudflarestorage.com/bucket/key?...).
 * Returns null if the key can't be determined.
 */
function extractR2Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".r2.dev")) {
      // Public URL: pathname is /<key>
      return parsed.pathname.replace(/^\//, "");
    }
    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com")) {
      // Presigned URL: pathname is /<bucket>/<key>
      const parts = parsed.pathname.replace(/^\//, "").split("/");
      return parts.slice(1).join("/"); // strip bucket name
    }
    return null;
  } catch {
    return null;
  }
}

// Generate a random invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Calculate days since a date using calendar-day boundaries (midnight).
// A visit at 11pm last night counts as 1 day ago at 12:01am today,
// not 1 day ago at 11:01pm today.
function daysSince(date: Date): number {
  const now = new Date();
  // Strip time component — compare date-only at local midnight
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visitMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = todayMidnight.getTime() - visitMidnight.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

// Get status color based on days and threshold
function getStatus(daysSinceVisit: number, threshold: number): "green" | "yellow" | "orange" | "red" {
  const pct = daysSinceVisit / threshold;
  if (pct < 0.33) return "green";
  if (pct < 0.66) return "yellow";
  if (pct < 1) return "orange";
  return "red";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * Permanently delete the current user's account and all their data.
     * Required by Apple App Store guidelines (since June 2022).
     *
     * Cascade order:
     *  1. Remove the user from all elder memberships
     *  2. Delete elder profiles they created where they are the ONLY admin
     *     (profiles with another admin are left intact but de-membered)
     *  3. Delete all their visits, planned visits, notifications, contributions
     *  4. Delete the user record itself
     *  5. Clear the session cookie
     */
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const userId = ctx.user.id;

      // 1. Find all elder profiles this user administers
      const adminMemberships = await db
        .select()
        .from(elderMembers)
        .where(and(eq(elderMembers.userId, userId), eq(elderMembers.role, "admin")));

      for (const membership of adminMemberships) {
        const elderId = membership.elderId;

        // Check if there are other members on this profile
        const otherMembers = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, elderId)));

        const otherAdmins = otherMembers.filter(m => m.userId !== userId && m.role === "admin");
        const hasOtherAdmin = otherAdmins.length > 0;

        if (!hasOtherAdmin) {
          // No other admin — cancel any active LS subscription first, then delete everything
          const [elderRecord] = await db.select().from(elders).where(eq(elders.id, elderId)).limit(1);
          if (elderRecord?.lemonsqueezySubscriptionId) {
            await cancelLemonSqueezySubscription(elderRecord.lemonsqueezySubscriptionId);
          }
          // Delete elder profile photo from R2
          if (elderRecord?.photoUrl) {
            const key = extractR2Key(elderRecord.photoUrl);
            if (key) await storageDelete(key).catch(() => {});
          }
          await db.delete(visits).where(eq(visits.elderId, elderId));
          await db.delete(plannedVisits).where(eq(plannedVisits.elderId, elderId));
          await db.delete(notifications).where(eq(notifications.elderId, elderId));
          await db.delete(subscriptionContributions).where(eq(subscriptionContributions.elderId, elderId));
          await db.delete(elderMembers).where(eq(elderMembers.elderId, elderId));
          await db.delete(elders).where(eq(elders.id, elderId));
        } else {
          // Another admin exists — just remove this user from the profile
          await db.delete(elderMembers)
            .where(and(eq(elderMembers.elderId, elderId), eq(elderMembers.userId, userId)));
        }
      }

      // 2. Remove this user from any remaining memberships (non-admin roles)
      await db.delete(elderMembers).where(eq(elderMembers.userId, userId));

      // 3. Delete the user's personal data across all tables
      await db.delete(visits).where(eq(visits.userId, userId));
      await db.delete(plannedVisits).where(eq(plannedVisits.userId, userId));
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(subscriptionContributions).where(eq(subscriptionContributions.userId, userId));

      // 4. Delete the user record
      await db.delete(users).where(eq(users.id, userId));

      // 5. Clear the session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      console.log(`[deleteAccount] User ${userId} account permanently deleted.`);
      return { success: true } as const;
    }),
  }),

  // ─── ELDERS ────────────────────────────────────────────────────────────────
  elders: router({
    // List all elder profiles the current user belongs to.
    // Optimised to use bulk queries instead of N+1 per elder.
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const memberships = await db
        .select()
        .from(elderMembers)
        .where(eq(elderMembers.userId, ctx.user.id));

      const elderIds = memberships.map(m => m.elderId);
      if (elderIds.length === 0) return [];

      // Bulk fetch all elders in one query
      const elderRows = await db
        .select()
        .from(elders)
        .where(inArray(elders.id, elderIds));

      // Bulk fetch last visit per elder using a single query per elder is unavoidable
      // without raw SQL window functions — but we fetch all visits and pick the latest.
      const allRecentVisits = await db
        .select()
        .from(visits)
        .where(inArray(visits.elderId, elderIds))
        .orderBy(desc(visits.visitedAt));

      // Bulk fetch all member counts
      const allMembers = await db
        .select()
        .from(elderMembers)
        .where(inArray(elderMembers.elderId, elderIds));

      // Build maps for O(1) lookup
      const lastVisitMap = new Map<number, Date>();
      for (const v of allRecentVisits) {
        if (!lastVisitMap.has(v.elderId)) lastVisitMap.set(v.elderId, v.visitedAt);
      }
      const memberCountMap = new Map<number, number>();
      for (const m of allMembers) {
        memberCountMap.set(m.elderId, (memberCountMap.get(m.elderId) ?? 0) + 1);
      }

      return elderRows.map(elder => {
        const lastVisitDate = lastVisitMap.get(elder.id) ?? null;
        const daysSinceVisit = lastVisitDate ? daysSince(lastVisitDate) : 999;
        return {
          ...elder,
          daysSinceVisit,
          status: getStatus(daysSinceVisit, elder.alertThresholdDays),
          memberCount: memberCountMap.get(elder.id) ?? 0,
          lastVisitDate,
        };
      });
    }),

    // Get a single elder profile
    get: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // Check membership
        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member of this elder's family");

        const [elder] = await db.select().from(elders).where(eq(elders.id, input.elderId)).limit(1);
        if (!elder) throw new Error("Elder not found");

        const [lastVisit] = await db
          .select()
          .from(visits)
          .where(eq(visits.elderId, input.elderId))
          .orderBy(desc(visits.visitedAt))
          .limit(1);

        const daysSinceVisit = lastVisit ? daysSince(lastVisit.visitedAt) : 999;
        const status = getStatus(daysSinceVisit, elder.alertThresholdDays);

        // My last visit
        const [myLastVisit] = await db
          .select()
          .from(visits)
          .where(and(eq(visits.elderId, input.elderId), eq(visits.userId, ctx.user.id)))
          .orderBy(desc(visits.visitedAt))
          .limit(1);

        const myDaysSince = myLastVisit ? daysSince(myLastVisit.visitedAt) : 999;

        return {
          ...elder,
          daysSinceVisit,
          status,
          lastVisitDate: lastVisit?.visitedAt ?? null,
          myLastVisitDate: myLastVisit?.visitedAt ?? null,
          myDaysSince,
          memberRole: membership.role,
          notificationsEnabled: membership.notificationsEnabled,
        };
      }),

    // Create a new elder profile
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        photoUrl: z.string().optional(),
        alertThresholdDays: z.number().min(1).max(365).default(21),
        birthday: z.string().regex(/^\d{2}-\d{2}$/).optional(), // "MM-DD"
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const inviteCode = generateInviteCode();

        const [result] = await db.insert(elders).values({
          name: input.name,
          photoUrl: input.photoUrl ?? null,
          alertThresholdDays: input.alertThresholdDays,
          birthday: input.birthday ?? null,
          inviteCode,
          createdByUserId: ctx.user.id,
        });

        const elderId = (result as any).insertId as number;

        // Auto-add creator as admin member
        await db.insert(elderMembers).values({
          elderId,
          userId: ctx.user.id,
          role: "admin",
        });

        const [elder] = await db.select().from(elders).where(eq(elders.id, elderId)).limit(1);
        return elder;
      }),

    // Update elder profile
    update: protectedProcedure
      .input(z.object({
        elderId: z.number(),
        name: z.string().min(1).max(128).optional(),
        photoUrl: z.string().optional(),
        alertThresholdDays: z.number().min(1).max(365).optional(),
        wellbeingEnabled: z.boolean().optional(),
        careNotes: z.string().optional(),
        birthday: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(), // "MM-DD" or null to clear
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // Must be admin
        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership || membership.role !== "admin") throw new Error("Admin access required");

        const [currentElder] = await db.select().from(elders).where(eq(elders.id, input.elderId)).limit(1);
        if (!currentElder) throw new Error("Elder not found");

        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl;
        if (input.alertThresholdDays !== undefined) updateData.alertThresholdDays = input.alertThresholdDays;
        if (input.birthday !== undefined) updateData.birthday = input.birthday; // can be null to clear

        // TEMP DEBUG — remove after photo bug is resolved
        console.log(`[update elder ${input.elderId}] input.photoUrl=${JSON.stringify(input.photoUrl)} | updateData keys=${Object.keys(updateData).join(',')} | currentPhotoUrl=${currentElder.photoUrl?.slice(0,60)}`);

        // Gran+ only features
        if (input.wellbeingEnabled !== undefined) {
          if (!currentElder.isPaid) throw new Error("Wellbeing check-ins require Gran+");
          updateData.wellbeingEnabled = input.wellbeingEnabled;
        }
        if (input.careNotes !== undefined) {
          if (!currentElder.isPaid) throw new Error("Care notes require Gran+");
          updateData.careNotes = input.careNotes;
        }

        await db.update(elders).set(updateData).where(eq(elders.id, input.elderId));
        const [elder] = await db.select().from(elders).where(eq(elders.id, input.elderId)).limit(1);
        return elder;
      }),

    // Join an elder profile via invite code
    join: protectedProcedure
      .input(z.object({ inviteCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [elder] = await db
          .select()
          .from(elders)
          .where(eq(elders.inviteCode, input.inviteCode.toUpperCase()))
          .limit(1);
        if (!elder) throw new Error("Invalid invite code");

        // Check not already a member
        const [existing] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, elder.id), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (existing) throw new Error("Already a member");

        // Check member limit (20 for free tier)
        const members = await db.select().from(elderMembers).where(eq(elderMembers.elderId, elder.id));
        if (!elder.isPaid && members.length >= 20) throw new Error("Member limit reached (20). Upgrade to Gran+ for unlimited members.");

        await db.insert(elderMembers).values({
          elderId: elder.id,
          userId: ctx.user.id,
          role: "member",
        });

        return elder;
      }),

    // Transfer admin rights to another member (admin only)
    transferAdmin: protectedProcedure
      .input(z.object({ elderId: z.number(), newAdminUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // Caller must be current admin
        const [myMembership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!myMembership || myMembership.role !== "admin") throw new Error("Admin access required");

        // Target must be a member
        const [targetMembership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, input.newAdminUserId)))
          .limit(1);
        if (!targetMembership) throw new Error("Target user is not a member");
        if (targetMembership.userId === ctx.user.id) throw new Error("You are already the admin");

        // Promote target to admin (keep current admin as admin too — multiple admins allowed)
        if (targetMembership.role === "admin") throw new Error("This member is already an admin");

        await db
          .update(elderMembers)
          .set({ role: "admin" })
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, input.newAdminUserId)));

        return { success: true };
      }),

    // Leave a family (non-admin members only)
    leave: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");
        if (membership.role === "admin") throw new Error("The profile admin cannot leave. Transfer admin rights first, or delete the profile.");

        await db
          .delete(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)));

        return { success: true };
      }),

    // Update notification preferences for the current user on an elder profile
    updateNotificationPrefs: protectedProcedure
      .input(z.object({ elderId: z.number(), notificationsEnabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");

        await db
          .update(elderMembers)
          .set({ notificationsEnabled: input.notificationsEnabled })
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)));

        return { success: true };
      }),

    // Get members of an elder profile
    members: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");

        const members = await db
          .select()
          .from(elderMembers)
          .where(eq(elderMembers.elderId, input.elderId));

        // Get user info for each member
        const { users } = await import("../drizzle/schema");
        const memberDetails = await Promise.all(
          members.map(async (m) => {
            const [user] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
            // Get their last visit
            const [lastVisit] = await db
              .select()
              .from(visits)
              .where(and(eq(visits.elderId, input.elderId), eq(visits.userId, m.userId)))
              .orderBy(desc(visits.visitedAt))
              .limit(1);
            return {
              ...m,
              userName: user?.name ?? "Family Member",
              userEmail: user?.email ?? null,
              lastVisitDate: lastVisit?.visitedAt ?? null,
              myDaysSince: lastVisit ? daysSince(lastVisit.visitedAt) : 999,
            };
          })
        );

        return memberDetails;
      }),
  }),

  // ─── VISITS ────────────────────────────────────────────────────────────────
  visits: router({
    // Log a visit (resets the clock)
    log: protectedProcedure
      .input(z.object({
        elderId: z.number(),
        visitedAt: z.string().optional(), // ISO date string, defaults to now
        notes: z.string().optional(),
        wellbeingScore: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");

        const visitDate = input.visitedAt ? new Date(input.visitedAt) : new Date();

        // Reject future-dated visits — they would reset Gran's status to green
        // and suppress alerts for the whole family.
        if (visitDate > new Date()) {
          throw new Error("Visit date cannot be in the future");
        }

        const [result] = await db.insert(visits).values({
          elderId: input.elderId,
          userId: ctx.user.id,
          visitedAt: visitDate,
          notes: input.notes ?? null,
          wellbeingScore: input.wellbeingScore ?? null,
        });

        return { success: true, visitId: (result as any).insertId };
      }),

    // List visits for an elder
    list: protectedProcedure
      .input(z.object({ elderId: z.number(), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");

        const visitList = await db
          .select()
          .from(visits)
          .where(eq(visits.elderId, input.elderId))
          .orderBy(desc(visits.visitedAt))
          .limit(input.limit);

        const { users } = await import("../drizzle/schema");
        return Promise.all(
          visitList.map(async (v) => {
            const [user] = await db.select().from(users).where(eq(users.id, v.userId)).limit(1);
            return { ...v, visitorName: user?.name ?? "Family Member" };
          })
        );
      }),
  }),

  // ─── PLANNED VISITS ────────────────────────────────────────────────────────
  planned: router({
    // Book a future visit slot
    book: protectedProcedure
      .input(z.object({
        elderId: z.number(),
        plannedDate: z.string(), // ISO date string
        notes: z.string().optional(),
        isRecurring: z.boolean().default(false),
        recurringWeeks: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");

        const [result] = await db.insert(plannedVisits).values({
          elderId: input.elderId,
          userId: ctx.user.id,
          plannedDate: new Date(input.plannedDate),
          notes: input.notes ?? null,
          isRecurring: input.isRecurring,
          recurringWeeks: input.recurringWeeks ?? null,
        });

        return { success: true, plannedVisitId: (result as any).insertId };
      }),

    // List planned visits for an elder
    list: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new Error("Not a member");

        const upcoming = await db
          .select()
          .from(plannedVisits)
          .where(and(
            eq(plannedVisits.elderId, input.elderId),
            gte(plannedVisits.plannedDate, new Date())
          ))
          .orderBy(plannedVisits.plannedDate);

        const { users } = await import("../drizzle/schema");
        return Promise.all(
          upcoming.map(async (p) => {
            const [user] = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
            return { ...p, visitorName: user?.name ?? "Family Member", isMe: p.userId === ctx.user.id };
          })
        );
      }),

    // Cancel a planned visit
    cancel: protectedProcedure
      .input(z.object({ plannedVisitId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [planned] = await db
          .select()
          .from(plannedVisits)
          .where(eq(plannedVisits.id, input.plannedVisitId))
          .limit(1);
        if (!planned || planned.userId !== ctx.user.id) throw new Error("Not found or not yours");

        await db.delete(plannedVisits).where(eq(plannedVisits.id, input.plannedVisitId));
        return { success: true };
      }),
  }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.sentAt))
        .limit(50);

      // Attach elder name so the UI can display which gran the alert is about
      return Promise.all(
        rows.map(async (n) => {
          const [elder] = await db
            .select({ name: elders.name })
            .from(elders)
            .where(eq(elders.id, n.elderId))
            .limit(1);
          return { ...n, elderName: elder?.name ?? null };
        })
      );
    }),

    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db
          .update(notifications)
          .set({ read: true })
          .where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, ctx.user.id)));
        return { success: true };
      }),

    markAllRead: protectedProcedure
      .input(z.object({ elderId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const condition = input.elderId
          ? and(eq(notifications.userId, ctx.user.id), eq(notifications.elderId, input.elderId))
          : eq(notifications.userId, ctx.user.id);
        await db.update(notifications).set({ read: true }).where(condition);
        return { success: true };
      }),
  }),

  // ─── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
  subscription: router({
    // Get subscription status and contributors for an elder
    status: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [elder] = await db.select().from(elders).where(eq(elders.id, input.elderId)).limit(1);
        if (!elder) throw new Error("Elder not found");

        const contributors = await db
          .select()
          .from(subscriptionContributions)
          .where(and(eq(subscriptionContributions.elderId, input.elderId), eq(subscriptionContributions.isActive, true)));

        const { users } = await import("../drizzle/schema");
        const contributorDetails = await Promise.all(
          contributors.map(async (c) => {
            const [user] = await db.select().from(users).where(eq(users.id, c.userId)).limit(1);
            return { ...c, userName: user?.name ?? "Family Member", isMe: c.userId === ctx.user.id };
          })
        );

        const perPerson = contributors.length > 0 ? Math.ceil(MONTHLY_COST_CENTS / contributors.length) : MONTHLY_COST_CENTS;

        return {
          isPaid: elder.isPaid,
          cancellationRequestedAt: elder.cancellationRequestedAt ?? null,
          contributors: contributorDetails,
          contributorCount: contributors.length,
          monthlyTotal: MONTHLY_COST,
          perPersonCost: perPerson,
          amIContributing: contributors.some(c => c.userId === ctx.user.id),
        };
      }),

    // Toggle contribution (join or leave the split)
    toggleContribution: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [existing] = await db
          .select()
          .from(subscriptionContributions)
          .where(and(eq(subscriptionContributions.elderId, input.elderId), eq(subscriptionContributions.userId, ctx.user.id)))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptionContributions)
            .set({ isActive: !existing.isActive })
            .where(eq(subscriptionContributions.id, existing.id));
        } else {
          await db.insert(subscriptionContributions).values({
            elderId: input.elderId,
            userId: ctx.user.id,
            isActive: true,
          });
        }

        return { success: true };
      }),

    // Owner-admin only: manually toggle paid status (for support/testing purposes only)
    setPaid: protectedProcedure
      .input(z.object({ elderId: z.number(), isPaid: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        // Security: only the global owner-admin can call this.
        // Elder-admin check was removed — it was exploitable by any user who created a profile.
        if (ctx.user.role !== "admin") throw new Error("Owner admin access required");

        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        await db.update(elders).set({ isPaid: input.isPaid }).where(eq(elders.id, input.elderId));
        return { success: true };
      }),

    // Admin: request cancellation of Gran+ (sends owner notification, marks pending)
    requestCancellation: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership || membership.role !== "admin") throw new Error("Admin access required");

        const [elder] = await db.select().from(elders).where(eq(elders.id, input.elderId)).limit(1);
        if (!elder) throw new Error("Elder not found");
        if (!elder.isPaid) throw new Error("Gran+ is not active for this profile");

        // Mark cancellation requested
        await db
          .update(elders)
          .set({ cancellationRequestedAt: new Date() })
          .where(eq(elders.id, input.elderId));

        // Notify owner
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `Gran+ Cancellation Request — ${elder.name}`,
          content: `${ctx.user.name ?? "An admin"} has requested cancellation of Gran+ for ${elder.name} (elder ID: ${elder.id}). Please cancel the subscription in your Lemon Squeezy dashboard (https://app.lemonsqueezy.com/subscriptions). Gran+ will remain active until you manually deactivate it.`,
        });

        return { success: true };
      }),

    // Admin: confirm cancellation (deactivates Gran+, clears flag)
    confirmCancellation: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [membership] = await db
          .select()
          .from(elderMembers)
          .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership || membership.role !== "admin") throw new Error("Admin access required");

        await db
          .update(elders)
          .set({ isPaid: false, cancellationRequestedAt: null })
          .where(eq(elders.id, input.elderId));

        // Deactivate all contributions
        await db
          .update(subscriptionContributions)
          .set({ isActive: false })
          .where(eq(subscriptionContributions.elderId, input.elderId));

        return { success: true };
      }),

    // Create a Lemon Squeezy checkout URL for Gran+ subscription
    createCheckout: protectedProcedure
      .input(z.object({
        elderId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { buildLemonSqueezyCheckout } = await import("./lemonSqueezyRoute");
        const url = await buildLemonSqueezyCheckout({
          elderId: input.elderId,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "GranWatch User",
        });
        return { url };
      }),
  }),

  // ─── SMART NOTIFICATIONS ───────────────────────────────────────────────────
  smartNotify: router({
    // Admin-only: fire test notifications instantly for demo/testing purposes
    test: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // Verify owner-admin only — elder-admins could use this to spam family members with emails
        if (ctx.user.role !== "admin") throw new Error("Owner admin access required");

        const [elder] = await db.select().from(elders).where(eq(elders.id, input.elderId)).limit(1);
        if (!elder) throw new Error("Elder not found");

        const { users } = await import("../drizzle/schema");

        // Get all members with their last visit dates
        const members = await db.select().from(elderMembers).where(eq(elderMembers.elderId, input.elderId));
        const membersWithVisits = await Promise.all(
          members.map(async (m) => {
            const [user] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
            const [lastVisit] = await db
              .select().from(visits)
              .where(and(eq(visits.elderId, input.elderId), eq(visits.userId, m.userId)))
              .orderBy(desc(visits.visitedAt))
              .limit(1);
            const myDaysSince = lastVisit ? daysSince(lastVisit.visitedAt) : 999;
            return { ...m, userName: user?.name ?? "Family Member", userEmail: user?.email ?? null, myDaysSince };
          })
        );

        // Filter out members who have opted out of notifications
        const notifyableMembers = membersWithVisits.filter(m => m.notificationsEnabled !== false);

        // Sort by longest absent first
        const sorted = [...notifyableMembers].sort((a, b) => b.myDaysSince - a.myDaysSince);

        // Check if a future visit is already scheduled within threshold
        const [lastVisit] = await db
          .select().from(visits)
          .where(eq(visits.elderId, input.elderId))
          .orderBy(desc(visits.visitedAt))
          .limit(1);
        const daysSinceVisit = lastVisit ? daysSince(lastVisit.visitedAt) : 999;

        const upcomingVisits = await db
          .select().from(plannedVisits)
          .where(and(eq(plannedVisits.elderId, input.elderId), gte(plannedVisits.plannedDate, new Date())));

        const hasCoveringVisit = upcomingVisits.some(v => {
          const daysUntil = Math.ceil((v.plannedDate.getTime() - Date.now()) / 86400000);
          return (daysSinceVisit + daysUntil) <= elder.alertThresholdDays;
        });

        if (hasCoveringVisit) {
          return { sent: 0, message: "Gran is already covered by a scheduled visit — no alerts needed." };
        }

        // Send nudge to top 2 longest-absent members (private, personal)
        const nudgeTargets = sorted.slice(0, 2);
        let sent = 0;
        for (const target of nudgeTargets) {
          await db.insert(notifications).values({
            userId: target.userId,
            elderId: input.elderId,
            type: "nudge" as const,
            read: false,
          });
          sent++;
        }

        // If red status, also send alert to everyone
        const isRed = daysSinceVisit >= elder.alertThresholdDays;
        if (isRed) {
          for (const member of members) {
            await db.insert(notifications).values({
              userId: member.userId,
              elderId: input.elderId,
              type: "red_alert" as const,
              read: false,
            });
            sent++;
          }
        }

        // Also send emails to all notifyable members with an address
        const { sendVisitReminderEmails } = await import("./email");
        const emailRecipients = notifyableMembers
          .filter((m) => m.userEmail)
          .map((m) => ({ name: m.userName, email: m.userEmail! }));

        let emailsSent = 0;
        if (emailRecipients.length > 0) {
          emailsSent = await sendVisitReminderEmails({
            recipients: emailRecipients,
            granName: elder.name,
            granPhotoUrl: elder.photoUrl ?? null,
            daysSince: daysSinceVisit,
            isWholeFamily: true,
          });
        }

        return {
          sent,
          emailsSent,
          message: `${sent} in-app notification${sent !== 1 ? "s" : ""} sent${emailsSent > 0 ? `, ${emailsSent} email${emailsSent !== 1 ? "s" : ""} sent` : ""}.`,
        };
      }),
  }),

  // ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
  admin: router({
    // List all registered users (owner/admin only)
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { users } = await import("../drizzle/schema");
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      return allUsers;
    }),

    // List all elder profiles with subscription status (owner/admin only)
    listElders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const allElders = await db
        .select({
          id: elders.id,
          name: elders.name,
          isPaid: elders.isPaid,
          alertThresholdDays: elders.alertThresholdDays,
          cancellationRequestedAt: elders.cancellationRequestedAt,
          createdAt: elders.createdAt,
        })
        .from(elders)
        .orderBy(desc(elders.createdAt));

      // Enrich with member count
      const { users } = await import("../drizzle/schema");
      return Promise.all(
        allElders.map(async (elder) => {
          const members = await db
            .select()
            .from(elderMembers)
            .where(eq(elderMembers.elderId, elder.id));
          const [lastVisit] = await db
            .select()
            .from(visits)
            .where(eq(visits.elderId, elder.id))
            .orderBy(desc(visits.visitedAt))
            .limit(1);
          return {
            ...elder,
            memberCount: members.length,
            daysSinceLastVisit: lastVisit ? Math.floor((Date.now() - lastVisit.visitedAt.getTime()) / 86400000) : null,
          };
        })
      );
    }),
  }),
});

export type AppRouter = typeof appRouter;
