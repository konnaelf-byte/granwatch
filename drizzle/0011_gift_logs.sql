-- Migration: 0011_gift_logs
-- Tracks every time a family member taps "Send Flowers" or "Send a Gift"
-- for an elder. Used to build the activity timeline and future commission reporting.

CREATE TABLE `giftLogs` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `elderId`       INT NOT NULL,
  `sentByUserId`  INT NOT NULL,
  `giftType`      ENUM('flowers','gift') NOT NULL,
  -- optional: filled once we have signed partner agreements
  `partnerName`   VARCHAR(255) DEFAULT NULL,
  `sentAt`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `giftLogs_elderId_idx` (`elderId`),
  INDEX `giftLogs_sentByUserId_idx` (`sentByUserId`),
  CONSTRAINT `giftLogs_elderId_fk`
    FOREIGN KEY (`elderId`) REFERENCES `elders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
