CREATE TABLE `elderMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`elderId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `elderMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `elders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`photoUrl` text,
	`alertThresholdDays` int NOT NULL DEFAULT 21,
	`wellbeingEnabled` boolean NOT NULL DEFAULT false,
	`careNotes` text,
	`inviteCode` varchar(16) NOT NULL,
	`isPaid` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `elders_id` PRIMARY KEY(`id`),
	CONSTRAINT `elders_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`elderId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('nudge','red_alert','weekly_digest') NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`read` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plannedVisits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`elderId` int NOT NULL,
	`userId` int NOT NULL,
	`plannedDate` timestamp NOT NULL,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`recurringWeeks` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plannedVisits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionContributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`elderId` int NOT NULL,
	`userId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptionContributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`elderId` int NOT NULL,
	`userId` int NOT NULL,
	`visitedAt` timestamp NOT NULL,
	`notes` text,
	`photoUrl` text,
	`wellbeingScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
