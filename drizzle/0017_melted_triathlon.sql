-- HAND-EDITED (2026-07-31): drizzle-kit generate re-emitted plannedVisitReminders /
-- timeOfDay / socialNotificationsEnabled because snapshots stopped at 0014 while
-- 0015 + 0016 were hand-written SQL. Those objects already exist in production,
-- so they were removed from this file — only the genuinely new change remains.
-- The 0017 snapshot correctly captures the full schema, healing the drift.
ALTER TABLE `elders` ADD `trialEndsAt` timestamp;--> statement-breakpoint
-- Grandfather every existing non-paying profile: 180 days of Gran+ from deploy.
-- (The 19 organic June families become trial users the week GranWatch launches.)
UPDATE `elders` SET `trialEndsAt` = DATE_ADD(NOW(), INTERVAL 180 DAY) WHERE `isPaid` = 0 AND `trialEndsAt` IS NULL;
