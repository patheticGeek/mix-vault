ALTER TABLE `tracks` ADD `status` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tracks_status` ON `tracks` (`status`);