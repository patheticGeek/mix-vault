DROP INDEX `idx_tracks_type`;--> statement-breakpoint
ALTER TABLE `tracks` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `tracks` DROP COLUMN `image`;--> statement-breakpoint
ALTER TABLE `tracks` RENAME COLUMN `file` TO `audio_file`;
