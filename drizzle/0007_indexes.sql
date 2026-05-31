-- Add indexes on high-traffic foreign-key columns
-- Without these, every visit/member/notification query is a full table scan.
-- Added 2026-05-31 following full codebase audit.

CREATE INDEX `elderMembers_elderId_idx` ON `elderMembers` (`elderId`);--> statement-breakpoint
CREATE INDEX `elderMembers_userId_idx` ON `elderMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `visits_elderId_idx` ON `visits` (`elderId`);--> statement-breakpoint
CREATE INDEX `visits_userId_idx` ON `visits` (`userId`);--> statement-breakpoint
CREATE INDEX `plannedVisits_elderId_idx` ON `plannedVisits` (`elderId`);--> statement-breakpoint
CREATE INDEX `subscriptionContributions_elderId_idx` ON `subscriptionContributions` (`elderId`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_elderId_idx` ON `notifications` (`elderId`);
