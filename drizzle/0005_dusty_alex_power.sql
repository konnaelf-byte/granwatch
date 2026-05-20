ALTER TABLE `elders` ADD `lemonsqueezySubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `elders` ADD `lemonsqueezyCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `elders` DROP COLUMN `stripeSubscriptionId`;