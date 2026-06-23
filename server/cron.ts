/**
 * Nightly notification cron job.
 *
 * Runs at 20:00 SAST (UTC+2) = 18:00 UTC every day.
 * For every elder profile, runs the smart notification logic:
 *
 * IN-APP NOTIFICATIONS:
 *   - Nudge the top 2 longest-absent members who have notifications enabled.
 *   - If the profile is in red status (overdue), alert all opted-in members.
 *   - Skip if a covering visit is already booked within the alert threshold.
 *
 * EMAIL NOTIFICATIONS:
 *   - 14 days without a visit → email the member(s) who visited furthest back (once per threshold crossing)
 *   - 21 days without a visit → email the entire family (once per threshold crossing)
 *   - A "threshold crossing" resets when a new visit is logged (daysSince drops below threshold)
 *   - Deduplication: we track the last visit date at the time of sending; if the lastVisitDate
 *     hasn't changed, we don't re-send.
 */

import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { elders, elderMembers, visits, plannedVisits, notifications, pushTokens } from "../drizzle/schema";
import { getDb } from "./db";
import { sendVisitReminderEmails, sendBirthdayReminderEmails, type EmailRecipient } from "./email";
import { sendPush } from "./push";

// Calendar-day boundary comparison (same logic as routers.ts)
function daysSince(date: Date): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visitMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = todayMidnight.getTime() - visitMidnight.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function startCronJobs() {
  console.log("[Cron] Scheduling nightly notification job at 20:00 SAST (18:00 UTC)");

  // Calculate milliseconds until the next 18:00 UTC
  function msUntilNextRun(): number {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(18, 0, 0, 0);
    if (next <= now) {
      // Already past today's run — schedule for tomorrow
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNextRun();
    const nextRun = new Date(Date.now() + delay);
    console.log(`[Cron] Next notification run scheduled for ${nextRun.toISOString()} (${Math.round(delay / 60000)} min from now)`);

    setTimeout(async () => {
      await runNightlyNotifications();
      // Schedule the next day's run
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}

/**
 * Sentinel userId values used to track email sends in the notifications table.
 * These are negative IDs that can never collide with real user IDs.
 * The sentAt timestamp records when the email was sent for a given threshold.
 * We also store the lastVisitId in the elderId field to detect threshold resets.
 *
 * Encoding: userId = -(threshold), elderId = elder.id (normal)
 * We check: has a weekly_digest row with userId=-14 (or -21) been inserted
 * AFTER the last visit was logged? If yes → already sent for this crossing.
 */
const EMAIL_SENTINEL_14 = -14;
const EMAIL_SENTINEL_21 = -21;
const EMAIL_SENTINEL_BDAY_3 = -30;  // birthday email sent 3 days before
const EMAIL_SENTINEL_BDAY_TODAY = -31; // birthday email sent on the day

async function runNightlyNotifications() {
  console.log("[Cron] Running nightly smart notifications...");
  const db = await getDb();
  if (!db) {
    console.warn("[Cron] DB unavailable — skipping nightly notifications");
    return;
  }

  try {
    const { users } = await import("../drizzle/schema");

    // Get all elder profiles
    const allElders = await db.select().from(elders);
    let totalInAppSent = 0;
    let totalEmailsSent = 0;

    for (const elder of allElders) {
      try {
        // Get all members for this elder
        const members = await db
          .select()
          .from(elderMembers)
          .where(eq(elderMembers.elderId, elder.id));

        if (members.length === 0) continue;

        // Get last visit for the elder profile
        const [lastVisit] = await db
          .select()
          .from(visits)
          .where(eq(visits.elderId, elder.id))
          .orderBy(desc(visits.visitedAt))
          .limit(1);

        const daysSinceVisit = lastVisit ? daysSince(lastVisit.visitedAt) : 999;
        const lastVisitDate = lastVisit?.visitedAt ?? null;

        // Check if a covering visit is already booked within the threshold window
        const upcomingVisits = await db
          .select()
          .from(plannedVisits)
          .where(and(eq(plannedVisits.elderId, elder.id), gte(plannedVisits.plannedDate, new Date())));

        const hasCoveringVisit = upcomingVisits.some((v) => {
          const daysUntil = Math.ceil((v.plannedDate.getTime() - Date.now()) / 86400000);
          return daysSinceVisit + daysUntil <= elder.alertThresholdDays;
        });

        // Build member list with visit recency — needed for both visit notifications AND birthday reminders
        const membersWithVisits = await Promise.all(
          members.map(async (m) => {
            const [user] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
            const [myLastVisit] = await db
              .select()
              .from(visits)
              .where(and(eq(visits.elderId, elder.id), eq(visits.userId, m.userId)))
              .orderBy(desc(visits.visitedAt))
              .limit(1);
            const myDaysSince = myLastVisit ? daysSince(myLastVisit.visitedAt) : 999;
            return {
              ...m,
              userName: user?.name ?? "Family Member",
              userEmail: user?.email ?? null,
              myDaysSince,
            };
          })
        );

        // Only notify members who have notifications enabled
        const notifyableMembers = membersWithVisits.filter((m) => m.notificationsEnabled !== false);
        const sorted = [...notifyableMembers].sort((a, b) => b.myDaysSince - a.myDaysSince);

        if (hasCoveringVisit) {
          console.log(`[Cron] Elder ${elder.id} (${elder.name}) — covered by upcoming visit, skipping visit notifications`);
        } else {
          // ── IN-APP NOTIFICATIONS ────────────────────────────────────────────

          // Nudge the top 2 longest-absent members
          const nudgeTargets = sorted.slice(0, 2);
          let inAppSent = 0;
          for (const target of nudgeTargets) {
            await db.insert(notifications).values({
              userId: target.userId,
              elderId: elder.id,
              type: "nudge" as const,
              read: false,
            });
            inAppSent++;
          }

          // If red status, also alert all opted-in members
          const isRed = daysSinceVisit >= elder.alertThresholdDays;
          if (isRed) {
            for (const member of notifyableMembers) {
              await db.insert(notifications).values({
                userId: member.userId,
                elderId: elder.id,
                type: "red_alert" as const,
                read: false,
              });
              inAppSent++;
            }
          }

          if (inAppSent > 0) {
            console.log(`[Cron] Elder ${elder.id} (${elder.name}) — sent ${inAppSent} in-app notification(s) [${isRed ? "RED ALERT" : "nudge"}]`);
          }
          totalInAppSent += inAppSent;

          // ── NATIVE PUSH (FCM) ───────────────────────────────────────────────
          // Mirror the same audience as in-app: nudge targets + red-alert all members
          const pushTargetIds = isRed
            ? notifyableMembers.map((m) => m.userId)
            : nudgeTargets.map((m) => m.userId);

          if (pushTargetIds.length > 0) {
            const userTokens = await db
              .select({ token: pushTokens.token })
              .from(pushTokens)
              .where(inArray(pushTokens.userId, pushTargetIds));

            const tokens = userTokens.map((r) => r.token);
            if (tokens.length > 0) {
              const pushTitle = isRed
                ? `⚠️ ${elder.name} needs a visit!`
                : `💛 Time to visit ${elder.name}`;
              const pushBody = isRed
                ? `It's been ${daysSinceVisit} days — the whole family has been alerted.`
                : `It's been ${daysSinceVisit} days since the last visit. Can you make it?`;
              const pushed = await sendPush(tokens, {
                title: pushTitle,
                body: pushBody,
                data: { path: `/elder/${elder.id}` },
              });
              if (pushed > 0) {
                console.log(`[Cron] Elder ${elder.id} (${elder.name}) — sent ${pushed} native push notification(s)`);
              }
            }
          }

          // ── EMAIL NOTIFICATIONS (visit reminders) ───────────────────────────
          // Deduplication: sentinel rows inserted after the last visit prevent re-sending.
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

          const email14AlreadySent = sentSentinels.some((n) => n.userId === EMAIL_SENTINEL_14);
          const email21AlreadySent = sentSentinels.some((n) => n.userId === EMAIL_SENTINEL_21);

          // 21-day trigger: email the whole family (once per threshold crossing)
          if (daysSinceVisit >= 21 && !email21AlreadySent) {
            const recipients: EmailRecipient[] = notifyableMembers
              .filter((m) => m.userEmail)
              .map((m) => ({ name: m.userName, email: m.userEmail! }));

            if (recipients.length > 0) {
              const sent = await sendVisitReminderEmails({
                recipients,
                granName: elder.name,
                granPhotoUrl: elder.photoUrl,
                daysSince: daysSinceVisit,
                isWholeFamily: true,
              });

              if (sent > 0) {
                await db.insert(notifications).values({
                  userId: EMAIL_SENTINEL_21,
                  elderId: elder.id,
                  type: "weekly_digest" as const,
                  read: true,
                });
                totalEmailsSent += sent;
                console.log(`[Cron] Elder ${elder.id} (${elder.name}) — sent 21-day family email to ${sent} member(s)`);
              }
            }
          }
          // 14-day trigger: email the member(s) who visited furthest back
          // Only fires in the 14–20 day window (21+ is handled above)
          else if (daysSinceVisit >= 14 && daysSinceVisit < 21 && !email14AlreadySent) {
            const maxDaysSince = sorted[0]?.myDaysSince ?? 0;
            const longestAbsent = sorted.filter((m) => m.myDaysSince === maxDaysSince && m.userEmail);

            const recipients: EmailRecipient[] = longestAbsent.map((m) => ({
              name: m.userName,
              email: m.userEmail!,
            }));

            if (recipients.length > 0) {
              const sent = await sendVisitReminderEmails({
                recipients,
                granName: elder.name,
                granPhotoUrl: elder.photoUrl,
                daysSince: daysSinceVisit,
                isWholeFamily: false,
              });

              if (sent > 0) {
                await db.insert(notifications).values({
                  userId: EMAIL_SENTINEL_14,
                  elderId: elder.id,
                  type: "weekly_digest" as const,
                  read: true,
                });
                totalEmailsSent += sent;
                console.log(`[Cron] Elder ${elder.id} (${elder.name}) — sent 14-day email to ${sent} longest-absent member(s)`);
              }
            }
          }
        } // end !hasCoveringVisit
        // ── BIRTHDAY REMINDERS ────────────────────────────────────────────────
        // Send an email 3 days before and again on the birthday itself.
        // Deduplication: sentinel rows with userId = EMAIL_SENTINEL_BDAY_* and
        // a sentAt in the current calendar year prevent re-sending.
        if (elder.birthday) {
          const now = new Date();
          // birthday is "YYYY-MM-DD" (new) or legacy "MM-DD" — extract month and day from the last two segments
          const bdParts = elder.birthday.split("-");
          const bdMm = Number(bdParts[bdParts.length - 2]);
          const bdDd = Number(bdParts[bdParts.length - 1]);
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const bdThisYear = new Date(now.getFullYear(), bdMm - 1, bdDd);
          const bdNextYear = new Date(now.getFullYear() + 1, bdMm - 1, bdDd);
          const nextBd = bdThisYear >= todayMidnight ? bdThisYear : bdNextYear;
          const daysUntilBd = Math.round((nextBd.getTime() - todayMidnight.getTime()) / 86400000);

          // Check sentinels for this calendar year
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

          const bdTodayAlreadySent = bdSentinels.some((n) => n.userId === EMAIL_SENTINEL_BDAY_TODAY);
          const bd3dayAlreadySent = bdSentinels.some((n) => n.userId === EMAIL_SENTINEL_BDAY_3);

          const bdRecipients: EmailRecipient[] = membersWithVisits
            .filter((m) => m.notificationsEnabled !== false && m.userEmail)
            .map((m) => ({ name: m.userName, email: m.userEmail! }));

          if (daysUntilBd === 0 && !bdTodayAlreadySent && bdRecipients.length > 0) {
            const sent = await sendBirthdayReminderEmails({
              recipients: bdRecipients,
              granName: elder.name,
              granPhotoUrl: elder.photoUrl,
              isToday: true,
            });
            if (sent > 0) {
              await db.insert(notifications).values({
                userId: EMAIL_SENTINEL_BDAY_TODAY,
                elderId: elder.id,
                type: "weekly_digest" as const,
                read: true,
              });
              totalEmailsSent += sent;
              console.log(`[Cron] Elder ${elder.id} (${elder.name}) — sent birthday TODAY email to ${sent} member(s)`);
            }
          } else if (daysUntilBd === 3 && !bd3dayAlreadySent && bdRecipients.length > 0) {
            const sent = await sendBirthdayReminderEmails({
              recipients: bdRecipients,
              granName: elder.name,
              granPhotoUrl: elder.photoUrl,
              isToday: false,
            });
            if (sent > 0) {
              await db.insert(notifications).values({
                userId: EMAIL_SENTINEL_BDAY_3,
                elderId: elder.id,
                type: "weekly_digest" as const,
                read: true,
              });
              totalEmailsSent += sent;
              console.log(`[Cron] Elder ${elder.id} (${elder.name}) — sent birthday 3-day reminder email to ${sent} member(s)`);
            }
          }
        }
      } catch (elderErr) {
        console.error(`[Cron] Error processing elder ${elder.id}:`, elderErr);
      }
    }

    console.log(`[Cron] Nightly run complete — ${totalInAppSent} in-app + ${totalEmailsSent} email notification(s) sent across ${allElders.length} profile(s)`);
  } catch (err) {
    console.error("[Cron] Nightly notification job failed:", err);
  }
}
