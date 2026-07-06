ALTER TABLE `tracks` ADD `type` text DEFAULT 'song' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tracks_type` ON `tracks` (`type`);
