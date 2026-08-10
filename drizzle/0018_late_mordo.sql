CREATE TABLE `counterLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`counterId` int NOT NULL,
	`elderId` int NOT NULL,
	`loggedByUserId` int NOT NULL,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `counterLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `elderCounters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`elderId` int NOT NULL,
	`name` varchar(30) NOT NULL,
	`emoji` varchar(16) NOT NULL DEFAULT '💚',
	`intervalDays` int NOT NULL,
	`scope` enum('private','family') NOT NULL DEFAULT 'family',
	`ownerUserId` int,
	`createdByUserId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastNotifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `elderCounters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `counterLogs_counterId_idx` ON `counterLogs` (`counterId`);--> statement-breakpoint
CREATE INDEX `counterLogs_elderId_idx` ON `counterLogs` (`elderId`);--> statement-breakpoint
CREATE INDEX `elderCounters_elderId_idx` ON `elderCounters` (`elderId`);