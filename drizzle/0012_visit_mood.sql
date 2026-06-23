-- Migration: 0012_visit_mood
-- Adds an optional mood to logged visits.
--   moodEmoji: free for everyone (fixed allowed set, validated server-side)
--   moodNote:  Gran+ only (enforced server-side on elder.isPaid)
-- MySQL has no IF NOT EXISTS for ADD COLUMN — this migration runs exactly once.

ALTER TABLE `visits` ADD COLUMN `moodEmoji` varchar(16);--> statement-breakpoint
ALTER TABLE `visits` ADD COLUMN `moodNote` text;
