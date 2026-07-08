PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`audio_file` text NOT NULL,
	`artwork_file` text NOT NULL,
	`waveform_preview` text NOT NULL,
	`duration` real NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tracks`("id", "title", "description", "tags", "audio_file", "artwork_file", "waveform_preview", "duration", "slug", "created_at") SELECT "id", "title", "description", "tags", "audio_file", "artwork_file", "waveform_preview", 0, "slug", "created_at" FROM `tracks`;--> statement-breakpoint
DROP TABLE `tracks`;--> statement-breakpoint
ALTER TABLE `__new_tracks` RENAME TO `tracks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_slug_unique` ON `tracks` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_tracks_title` ON `tracks` (`title`);--> statement-breakpoint
CREATE INDEX `idx_tracks_tags` ON `tracks` (`tags`);