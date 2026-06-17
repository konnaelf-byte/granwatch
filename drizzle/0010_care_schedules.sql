-- Gran+ care schedule tables: medications + doctor appointments
-- Gated behind elder.isPaid (Gran+)

CREATE TABLE `elderMedications` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `elderId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `dosage` varchar(100),
  `frequency` enum('daily','twice_daily','weekly','as_needed') NOT NULL DEFAULT 'daily',
  `notes` text,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `medicationLogs` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `medicationId` int NOT NULL,
  `elderId` int NOT NULL,
  `loggedByUserId` int NOT NULL,
  `takenAt` timestamp NOT NULL,
  `status` enum('taken','missed') NOT NULL DEFAULT 'taken',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `elderAppointments` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `elderId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `doctorName` varchar(255),
  `location` varchar(255),
  `scheduledAt` timestamp NOT NULL,
  `completedAt` timestamp,
  `notes` text,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

ALTER TABLE `elderMedications` ADD CONSTRAINT `elderMedications_elderId_fk`
  FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE;

ALTER TABLE `medicationLogs` ADD CONSTRAINT `medicationLogs_medicationId_fk`
  FOREIGN KEY (`medicationId`) REFERENCES `elderMedications`(`id`) ON DELETE CASCADE;

ALTER TABLE `medicationLogs` ADD CONSTRAINT `medicationLogs_elderId_fk`
  FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE;

ALTER TABLE `elderAppointments` ADD CONSTRAINT `elderAppointments_elderId_fk`
  FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE;

CREATE INDEX `elderMedications_elderId_idx` ON `elderMedications` (`elderId`);
CREATE INDEX `medicationLogs_medicationId_idx` ON `medicationLogs` (`medicationId`);
CREATE INDEX `medicationLogs_elderId_idx` ON `medicationLogs` (`elderId`);
CREATE INDEX `elderAppointments_elderId_idx` ON `elderAppointments` (`elderId`);
