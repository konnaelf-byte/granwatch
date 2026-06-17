-- Push notification tokens — store per-device FCM tokens for native push delivery
-- Added 2026-06-17

CREATE TABLE `pushTokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `token` varchar(512) NOT NULL,
  `platform` enum('ios','android','web') NOT NULL DEFAULT 'ios',
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pushTokens_token_unique` UNIQUE(`token`)
);--> statement-breakpoint

CREATE INDEX `pushTokens_userId_idx` ON `pushTokens` (`userId`);
