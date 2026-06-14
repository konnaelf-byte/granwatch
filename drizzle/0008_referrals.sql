-- Referral program tables
-- Added 2026-06-06

CREATE TABLE `referrals` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `code` varchar(16) NOT NULL,
  `signupCount` int DEFAULT 0 NOT NULL,
  `convertedCount` int DEFAULT 0 NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  CONSTRAINT `referrals_userId_unique` UNIQUE(`userId`),
  CONSTRAINT `referrals_code_unique` UNIQUE(`code`)
);--> statement-breakpoint

CREATE TABLE `referralSignups` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `referralCode` varchar(16) NOT NULL,
  `newUserId` int NOT NULL,
  `converted` boolean DEFAULT false NOT NULL,
  `rewardAppliedAt` timestamp,
  `createdAt` timestamp DEFAULT (now()) NOT NULL
);--> statement-breakpoint

CREATE INDEX `referralSignups_code_idx` ON `referralSignups` (`referralCode`);--> statement-breakpoint
CREATE INDEX `referralSignups_newUserId_idx` ON `referralSignups` (`newUserId`);
