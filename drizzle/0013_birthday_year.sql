-- Widen birthday column from "MM-DD" (5 chars) to "YYYY-MM-DD" (10 chars).
-- Existing MM-DD values remain valid; the cron handles both formats.
ALTER TABLE `elders` MODIFY COLUMN `birthday` varchar(10);
