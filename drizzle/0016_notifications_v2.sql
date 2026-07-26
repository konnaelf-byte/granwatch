ALTER TABLE `elderMembers` ADD COLUMN `socialNotificationsEnabled` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE `plannedVisitReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plannedVisitId` int NOT NULL,
	`phase` enum('day_before','day_of','log_prompt') NOT NULL,
	`visitDay` varchar(10) NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plannedVisitReminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `pvr_visit_phase_day_idx` UNIQUE(`plannedVisitId`,`phase`,`visitDay`)
);
