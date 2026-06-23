-- Gran+ care schedule tables: medications/routines + appointments
-- Gated behind elder.isPaid (Gran+)
-- Rewritten 2026-06-23: inline FKs/indexes + IF NOT EXISTS + statement breakpoints
-- so the runtime drizzle migrator applies it cleanly and idempotently.

CREATE TABLE IF NOT EXISTS `elderMedications` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `elderId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `dosage` varchar(100),
  `frequency` enum('daily','twice_daily','weekly','as_needed') NOT NULL DEFAULT 'daily',
  `notes` text,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  INDEX `elderMedications_elderId_idx` (`elderId`),
  CONSTRAINT `elderMedications_elderId_fk` FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `medicationLogs` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `medicationId` int NOT NULL,
  `elderId` int NOT NULL,
  `loggedByUserId` int NOT NULL,
  `takenAt` timestamp NOT NULL,
  `status` enum('taken','missed') NOT NULL DEFAULT 'taken',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  INDEX `medicationLogs_medicationId_idx` (`medicationId`),
  INDEX `medicationLogs_elderId_idx` (`elderId`),
  CONSTRAINT `medicationLogs_medicationId_fk` FOREIGN KEY (`medicationId`) REFERENCES `elderMedications`(`id`) ON DELETE CASCADE,
  CONSTRAINT `medicationLogs_elderId_fk` FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `elderAppointments` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `elderId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `doctorName` varchar(255),
  `location` varchar(255),
  `scheduledAt` timestamp NOT NULL,
  `completedAt` timestamp,
  `notes` text,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  INDEX `elderAppointments_elderId_idx` (`elderId`),
  CONSTRAINT `elderAppointments_elderId_fk` FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE
);
