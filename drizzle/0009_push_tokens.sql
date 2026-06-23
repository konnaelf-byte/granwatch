-- Push notification tokens — store per-device FCM tokens for native push delivery
-- Added 2026-06-17; rewritten 2026-06-23 to be idempotent (inline index, IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS `pushTokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `token` varchar(512) NOT NULL,
  `platform` enum('ios','android','web') NOT NULL DEFAULT 'ios',
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `pushTokens_userId_idx` (`userId`),
  CONSTRAINT `pushTokens_token_unique` UNIQUE(`token`)
);
