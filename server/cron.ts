/**
 * GranWatch notification engine (v2 — 2026-07-26).
 *
 * DESIGN PRINCIPLE: never spam. Every notification fires exactly once per
 * event, and a green ring generates total silence.
 *
 * The scheduler ticks HOURLY (on the hour). Each tick:
 *   - 20:00 SAST → nightly visit-status run (nudge / red alert / birthdays)
 *   - every hour → scheduled-visit reminder sweep (day-before / day-of / log-prompt)
 *
 * VISIT-STATUS NOTIFICATIONS (push + email + in-app fire TOGETHER, once per crossing):
 *   GREEN  (before the nudge day)              → nothing.
 *   NUDGE  (⅔ of the red threshold, rounded)   → the member(s) who visited
 *          furthest back. Default red=21 → nudge=14. Custom red scales:
 *          30→20, 17→11, 14→9, 7→5.
 *   RED    (elder.alertThresholdDays, per-gran custom) → the whole family.
 *   "Once per crossing" = a sentinel row inserted after sending; logging a
 *   visit moves lastVisitDate forward, which invalidates the sentinel and
 *   re-arms the cycle. A booked covering visit suppresses everything.
 *
 * BIRTHDAYS: email + push 3 days before and on the day (once per year each).
 *
 * SCHEDULED-VISIT REMINDERS (to the member who booked, once per occurrence):
 *   day_before → 18:00 SAST the evening before
 *   day_of     → 08:00 SAST that morning
 *   log_prompt → 2h after the visit time (or 19:00 SAST if day-only) —
 *                suppressed automatically if the visit was already logged.
 *
 * All times use SAST (UTC+2) — the app's home timezone convention.
 */

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { elders, elderMembers, visits, plannedVisits, plannedVisitReminders, notifications, pushTokens } from "../drizzle/schema";
import { getDb } from "./db";
import { sendVisitReminderEmails, sendBirthdayReminderEmails, type EmailRecipient } from "./email";
import { sendPush } from "./push";

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2

/** Date shifted into SAST wall-clock (read components via getUTC*). */
function toSast(d: Date): Date {
  return new Date(d.getTime() + SAST_OFFSET_MS);
}

/** "YYYY-MM-DD" of a date in SAST. */
function sastDayString(d: Date): string {
  return toSast(d).toISOString().slice(0, 10);
}

/** Whether a stored plannedDate carries a chosen time (midnight SAST = day-only). */
function hasSastTime(d: Date): boolean {
  const s = toSast(d);
  return s.getUTCHours() !== 0 || s.getUTCMinutes() !== 0;
}

function formatSastTime(d: Date): string {
  const s = toSast(d);
  return `${String(s.getUTCHours()).padStart(2, "0")}:${String(s.getUTCMinutes()).padStart(2, "0")}`;
}

// Calendar-day boundary comparison (same logic as routers.ts)
function daysSince(date: Date): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visitMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = todayMidnight.getTime() - visitMidnight.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/** The nudge lands at ⅔ of the red threshold: 21→14, 30→20, 17→11, 7→5. */
export function nudgeDaysFor(alertThresholdDays: number): number {
  return Math.max(1, Math.round((alertThresholdDays * 2) / 3));
}

/**
 * Push to every registered device of the given users. Returns delivered count.
 * The iOS badge is set to each recipient's real unread in-app count (min 1),
 * so the red dot matches what they'll see in the app — and clears properly
 * when markRead/markAllRead later syncs it back down (see routers.ts).
 */
async function pushToUsers(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userIds: number[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = await db
    .select({ token: pushTokens.token, userId: pushTokens.userId })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, userIds));
  if (rows.length === 0) return 0;

  // Unread in-app notifications per user (the nudge/red inserts happen before
  // this call, so the fresh notification is already counted).
  const unreadRows = await db
    .select({ userId: notifications.userId })
    .from(notifications)
    .where(and(inArray(notifications.userId, userIds), eq(notifications.read, false)));
  const unreadByUser = new Map<number, number>();
  for (const r of unreadRows) unreadByUser.set(r.userId, (unreadByUser.get(r.userId) ?? 0) + 1);

  const tokensByUser = new Map<number, string[]>();
  for (const r of rows) {
    const list = tokensByUser.get(r.userId) ?? [];
    list.push(r.token);
    tokensByUser.set(r.userId, list);
  }

  let delivered = 0;
  for (const [userId, tokens] of Array.from(tokensByUser.entries())) {
    delivered += await sendPush(tokens, {
      ...payload,
      badge: Math.max(1, unreadByUser.get(userId) ?? 0),
    });
  }
  return delivered;
}

export function startCronJobs() {
  console.log("[Cron] Hourly notification scheduler starting (nightly status run at 20:00 SAST)");

  function msUntilNextHour(): number {
    const now = new Date();
    const next = new Date(now);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNextHour();
    setTimeout(async () => {
      await runHourlyTick();
      scheduleNext();
    }, delay);
    const nextRun = new Date(Date.now() + delay);
    console.log(`[Cron] Next tick at ${nextRun.toISOString()} (${Math.round(delay / 60000)} min)`);
  }

  scheduleNext();
}

async function runHourlyTick() {
  const sastHour = toSast(new Date()).getUTCHours();
  try {
    await runPlannedVisitReminders(sastHour);
  } catch (err) {
    console.error("[Cron] Planned-visit reminder sweep failed:", err);
  }
  if (sastHour === 20) {
    try {
      await runNightlyNotifications();
    } catch (err) {
      console.error("[Cron] Nightly notification job failed:", err);
    }
  }
}

/**
 * Sentinel userId values in the notifications table (type weekly_digest).
 * Negative IDs can never collide with real users. A sentinel with
 * sentAt >= lastVisitDate means "already sent for this crossing".
 */
const SENTINEL_NUDGE = -14;
const SENTINEL_RED = -21;
const SENTINEL_BDAY_3 = -30;
const SENTINEL_BDAY_TODAY = -31;

async function runNightlyNotifications() {
  console.log("[Cron] Running nightly visit-status notifications...");
  const db = await getDb();
  if (!db) {
    console.warn("[Cron] DB unavailable — skipping nightly notifications");
    return;
  }

  const { users } = await import("../drizzle/schema");

  const allElders = await db.select().from(elders);

  // ── Spike protection: jitter the blast ─────────────────────────────────────
  // Without this, EVERY family's nudge/alert lands in the same minute (20:00
  // SAST) — the app manufactures its own thundering herd of opens. Shuffle the
  // elder order and pace sends so the whole run spreads across up to ~15 min
  // regardless of family count (per-elder delay shrinks as we grow; capped at
  // 5s so small fleets still finish in seconds).
  const JITTER_WINDOW_MS = 15 * 60 * 1000;
  const perElderDelayMs = Math.min(5000, JITTER_WINDOW_MS / Math.max(allElders.length, 1));
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  for (let i = allElders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allElders[i], allElders[j]] = [allElders[j], allElders[i]];
  }

  let totalInAppSent = 0;
  let totalEmailsSent = 0;
  let totalPushSent = 0;

  for (const elder of allElders) {
    try {
      // Jittered pacing (see above) — spreads the nightly blast.
      await sleep(perElderDelayMs * (0.5 + Math.random()));

      const members = await db
        .select()
        .from(elderMembers)
        .where(eq(elderMembers.elderId, elder.id));
      if (members.length === 0) continue;

      const [lastVisit] = await db
        .select()
        .from(visits)
        .where(eq(visits.elderId, elder.id))
        .orderBy(desc(visits.visitedAt))
        .limit(1);

      const daysSinceVisit = lastVisit ? daysSince(lastVisit.visitedAt) : 999;
      const lastVisitDate = lastVisit?.visitedAt ?? null;

      // A booked covering visit suppresses all visit-status noise.
      const upcomingVisits = await db
        .select()
        .from(plannedVisits)
        .where(and(eq(plannedVisits.elderId, elder.id), gte(plannedVisits.plannedDate, new Date())));
      const hasCoveringVisit = upcomingVisits.some((v) => {
        const daysUntil = Math.ceil((v.plannedDate.getTime() - Date.now()) / 86400000);
        return daysSinceVisit + daysUntil <= elder.alertThresholdDays;
      });

      // Member list with per-member visit recency (used by nudge targeting + birthdays)
      const membersWithVisits = await Promise.all(
        members.map(async (m) => {
          const [user] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
          const [myLastVisit] = await db
            .select()
            .from(visits)
            .where(and(eq(visits.elderId, elder.id), eq(visits.userId, m.userId)))
            .orderBy(desc(visits.visitedAt))
            .limit(1);
          return {
            ...m,
            userName: user?.name ?? "Family Member",
            userEmail: user?.email ?? null,
            myDaysSince: myLastVisit ? daysSince(myLastVisit.visitedAt) : 999,
          };
        })
      );
      const notifyableMembers = membersWithVisits.filter((m) => m.notificationsEnabled !== false);
      const sorted = [...notifyableMembers].sort((a, b) => b.myDaysSince - a.myDaysSince);

      if (!hasCoveringVisit) {
        const redDay = elder.alertThresholdDays;
        const nudgeDay = nudgeDaysFor(redDay);
        const isRed = daysSinceVisit >= redDay;
        const isNudge = !isRed && daysSinceVisit >= nudgeDay;

        // Sentinels newer than the last visit = this crossing already handled.
        const lastVisitCutoff = lastVisitDate ?? new Date(0);
        const sentSentinels = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.elderId, elder.id),
              eq(notifications.type, "weekly_digest"),
              gte(notifications.sentAt, lastVisitCutoff)
            )
          );
        const nudgeAlreadySent = sentSentinels.some((n) => n.userId === SENTINEL_NUDGE);
        const redAlreadySent = sentSentinels.some((n) => n.userId === SENTINEL_RED);

        // ── RED: whole family, once per crossing ──────────────────────────
        if (isRed && !redAlreadySent) {
          const recipients: EmailRecipient[] = notifyableMembers
            .filter((m) => m.userEmail)
            .map((m) => ({ name: m.userName, email: m.userEmail! }));
          const emailsSent = recipients.length > 0
            ? await sendVisitReminderEmails({
                recipients,
                granName: elder.name,
                elderId: elder.id,
                granPhotoUrl: elder.photoUrl,
                daysSince: daysSinceVisit,
                isWholeFamily: true,
              })
            : 0;

          for (const member of notifyableMembers) {
            await db.insert(notifications).values({
              userId: member.userId,
              elderId: elder.id,
              type: "red_alert" as const,
              read: false,
            });
            totalInAppSent++;
          }

          const pushed = await pushToUsers(db, notifyableMembers.map((m) => m.userId), {
            title: `⚠️ ${elder.name} needs a visit!`,
            body: `It's been ${daysSinceVisit} days — the whole family has been alerted.`,
            data: { path: `/elder/${elder.id}` },
          });

          // Mark the crossing handled even if some channels had no recipients —
          // this is the once-per-crossing guarantee.
          await db.insert(notifications).values({
            userId: SENTINEL_RED,
            elderId: elder.id,
            type: "weekly_digest" as const,
            read: true,
          });
          totalEmailsSent += emailsSent;
          totalPushSent += pushed;
          console.log(`[Cron] Elder ${elder.id} (${elder.name}) — RED crossing (day ${daysSinceVisit}/${redDay}): ${emailsSent} email, ${pushed} push, ${notifyableMembers.length} in-app`);
        }
        // ── NUDGE: longest-back visitor(s), once per crossing ─────────────
        else if (isNudge && !nudgeAlreadySent) {
          const maxDaysSince = sorted[0]?.myDaysSince ?? 0;
          const longestAbsent = sorted.filter((m) => m.myDaysSince === maxDaysSince);

          const recipients: EmailRecipient[] = longestAbsent
            .filter((m) => m.userEmail)
            .map((m) => ({ name: m.userName, email: m.userEmail! }));
          const emailsSent = recipients.length > 0
            ? await sendVisitReminderEmails({
                recipients,
                granName: elder.name,
                elderId: elder.id,
                granPhotoUrl: elder.photoUrl,
                daysSince: daysSinceVisit,
                isWholeFamily: false,
              })
            : 0;

          for (const target of longestAbsent) {
            await db.insert(notifications).values({
              userId: target.userId,
              elderId: elder.id,
              type: "nudge" as const,
              read: false,
            });
            totalInAppSent++;
          }

          const pushed = await pushToUsers(db, longestAbsent.map((m) => m.userId), {
            title: `💛 Time to visit ${elder.name}`,
            body: `It's been ${daysSinceVisit} days since the last visit. Can you make it?`,
            data: { path: `/elder/${elder.id}` },
          });

          await db.insert(notifications).values({
            userId: SENTINEL_NUDGE,
            elderId: elder.id,
            type: "weekly_digest" as const,
            read: true,
          });
          totalEmailsSent += emailsSent;
          totalPushSent += pushed;
          console.log(`[Cron] Elder ${elder.id} (${elder.name}) — NUDGE crossing (day ${daysSinceVisit}, nudge ${nudgeDay}, red ${redDay}): ${emailsSent} email, ${pushed} push to ${longestAbsent.length} member(s)`);
        }
        // GREEN or already handled: total silence.
      } else {
        console.log(`[Cron] Elder ${elder.id} (${elder.name}) — covered by upcoming visit, silent`);
      }

      // ── BIRTHDAYS: email + push, 3 days before and on the day ───────────
      if (elder.birthday) {
        const now = new Date();
        const bdParts = elder.birthday.split("-");
        const bdMm = Number(bdParts[bdParts.length - 2]);
        const bdDd = Number(bdParts[bdParts.length - 1]);
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const bdThisYear = new Date(now.getFullYear(), bdMm - 1, bdDd);
        const bdNextYear = new Date(now.getFullYear() + 1, bdMm - 1, bdDd);
        const nextBd = bdThisYear >= todayMidnight ? bdThisYear : bdNextYear;
        const daysUntilBd = Math.round((nextBd.getTime() - todayMidnight.getTime()) / 86400000);

        const yearStart = new Date(now.getFullYear(), 0, 1);
        const bdSentinels = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.elderId, elder.id),
              eq(notifications.type, "weekly_digest"),
              gte(notifications.sentAt, yearStart)
            )
          );
        const bdTodayAlreadySent = bdSentinels.some((n) => n.userId === SENTINEL_BDAY_TODAY);
        const bd3dayAlreadySent = bdSentinels.some((n) => n.userId === SENTINEL_BDAY_3);

        const bdMembers = membersWithVisits.filter((m) => m.notificationsEnabled !== false);
        const bdRecipients: EmailRecipient[] = bdMembers
          .filter((m) => m.userEmail)
          .map((m) => ({ name: m.userName, email: m.userEmail! }));

        const fireBirthday = async (isToday: boolean, sentinel: number) => {
          const sent = bdRecipients.length > 0
            ? await sendBirthdayReminderEmails({
                recipients: bdRecipients,
                granName: elder.name,
                elderId: elder.id,
                granPhotoUrl: elder.photoUrl,
                isToday,
              })
            : 0;
          const pushed = await pushToUsers(db, bdMembers.map((m) => m.userId), {
            title: isToday ? `🎂 It's ${elder.name}'s birthday today!` : `🎂 ${elder.name}'s birthday is in 3 days`,
            body: isToday
              ? `Make it a special one — a visit or a call means the world.`
              : `A perfect excuse to plan a visit.`,
            data: { path: `/elder/${elder.id}` },
          });
          if (sent > 0 || pushed > 0) {
            await db.insert(notifications).values({
              userId: sentinel,
              elderId: elder.id,
              type: "weekly_digest" as const,
              read: true,
            });
            totalEmailsSent += sent;
            totalPushSent += pushed;
            console.log(`[Cron] Elder ${elder.id} (${elder.name}) — birthday ${isToday ? "TODAY" : "3-day"}: ${sent} email, ${pushed} push`);
          }
        };

        if (daysUntilBd === 0 && !bdTodayAlreadySent) await fireBirthday(true, SENTINEL_BDAY_TODAY);
        else if (daysUntilBd === 3 && !bd3dayAlreadySent) await fireBirthday(false, SENTINEL_BDAY_3);
      }
    } catch (elderErr) {
      console.error(`[Cron] Error processing elder ${elder.id}:`, elderErr);
    }
  }

  console.log(`[Cron] Nightly run complete — ${totalInAppSent} in-app + ${totalEmailsSent} email + ${totalPushSent} push across ${allElders.length} profile(s)`);
}

/**
 * Scheduled-visit reminders — runs every hour.
 * Each phase fires at most once per (plannedVisit, occurrence day), enforced by
 * the plannedVisitReminders unique index. Late ticks catch up (>= comparisons)
 * so a missed hour still delivers, but never twice.
 */
async function runPlannedVisitReminders(sastHour: number) {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const upcoming = await db
    .select()
    .from(plannedVisits)
    .where(and(gte(plannedVisits.plannedDate, windowStart), lte(plannedVisits.plannedDate, windowEnd)));
  if (upcoming.length === 0) return;

  const todaySast = sastDayString(now);
  const tomorrowSast = sastDayString(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const { users } = await import("../drizzle/schema");
  let sentCount = 0;

  for (const pv of upcoming) {
    try {
      const visitDay = sastDayString(pv.plannedDate);
      const timed = hasSastTime(pv.plannedDate);

      // Respect the booker's notification preference for this gran.
      const [membership] = await db
        .select()
        .from(elderMembers)
        .where(and(eq(elderMembers.elderId, pv.elderId), eq(elderMembers.userId, pv.userId)))
        .limit(1);
      if (membership && membership.notificationsEnabled === false) continue;

      const [elder] = await db.select().from(elders).where(eq(elders.id, pv.elderId)).limit(1);
      if (!elder) continue;

      const alreadySent = await db
        .select({ phase: plannedVisitReminders.phase })
        .from(plannedVisitReminders)
        .where(and(eq(plannedVisitReminders.plannedVisitId, pv.id), eq(plannedVisitReminders.visitDay, visitDay)));
      const sentPhases = new Set(alreadySent.map((r) => r.phase));

      const markSent = (phase: "day_before" | "day_of" | "log_prompt") =>
        db.insert(plannedVisitReminders).values({ plannedVisitId: pv.id, phase, visitDay });

      // ── day_before: 18:00 SAST the evening before ─────────────────────
      if (!sentPhases.has("day_before") && visitDay === tomorrowSast && sastHour >= 18) {
        const pushed = await pushToUsers(db, [pv.userId], {
          title: `💛 Your visit to ${elder.name} is tomorrow`,
          body: timed ? `Scheduled for ${formatSastTime(pv.plannedDate)}. ${elder.name} will be so happy!` : `${elder.name} will be so happy!`,
          data: { path: `/elder/${pv.elderId}` },
        });
        await markSent("day_before");
        sentCount += pushed;
      }

      // ── day_of: 08:00 SAST that morning ───────────────────────────────
      if (!sentPhases.has("day_of") && visitDay === todaySast && sastHour >= 8) {
        const pushed = await pushToUsers(db, [pv.userId], {
          title: `💛 Your ${elder.name} visit is today`,
          body: timed ? `Scheduled for ${formatSastTime(pv.plannedDate)}. Have a lovely visit!` : `Have a lovely visit!`,
          data: { path: `/elder/${pv.elderId}` },
        });
        await markSent("day_of");
        sentCount += pushed;
      }

      // ── log_prompt: 2h after the set time, or 19:00 SAST if day-only ──
      if (!sentPhases.has("log_prompt") && visitDay === todaySast) {
        const due = timed
          ? now.getTime() >= pv.plannedDate.getTime() + 2 * 60 * 60 * 1000
          : sastHour >= 19;
        if (due) {
          // Already logged a visit today? Then stay silent (and mark done).
          const sastDayStartUtc = new Date(new Date(`${visitDay}T00:00:00Z`).getTime() - SAST_OFFSET_MS);
          const [loggedToday] = await db
            .select({ id: visits.id })
            .from(visits)
            .where(and(
              eq(visits.elderId, pv.elderId),
              eq(visits.userId, pv.userId),
              gte(visits.visitedAt, sastDayStartUtc),
            ))
            .limit(1);

          if (!loggedToday) {
            const pushed = await pushToUsers(db, [pv.userId], {
              title: `💚 How was the visit to ${elder.name}?`,
              body: `Log it so the family sees the ring turn green.`,
              data: { path: `/elder/${pv.elderId}` },
            });
            sentCount += pushed;
          }
          await markSent("log_prompt");
        }
      }
    } catch (pvErr) {
      console.error(`[Cron] Error processing planned visit ${pv.id}:`, pvErr);
    }
  }

  if (sentCount > 0) {
    console.log(`[Cron] Scheduled-visit sweep (hour ${sastHour} SAST) — ${sentCount} push reminder(s) sent`);
  }
}
