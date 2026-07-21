import { parseTrackLinks } from "@/lib/trackLinks";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const trackSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  audioFile: z.string(),
  artworkFile: z.string(),
  waveformPreview: z.string(),
  duration: z.number(),
  slug: z.string(),
  links: z.record(z.string(), z.string()),
  recordedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type Track = z.infer<typeof trackSchema>;

export function normalizeTrackRow(raw: unknown): Track {
  const row = raw as Record<string, unknown>;
  const tagsValue = row.tags;

  return trackSchema.parse({
    ...row,
    tags:
      typeof tagsValue === "string"
        ? JSON.parse(tagsValue)
        : Array.isArray(tagsValue)
          ? tagsValue
          : [],
    links: parseTrackLinks(row.links),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt
        : typeof row.createdAt === "number"
          ? new Date(row.createdAt)
          : typeof row.createdAt === "string"
            ? new Date(row.createdAt)
            : new Date(),
    recordedAt:
      row.recordedAt instanceof Date
        ? row.recordedAt
        : typeof row.recordedAt === "number"
          ? new Date(row.recordedAt)
          : typeof row.recordedAt === "string"
            ? new Date(row.recordedAt)
            : null,
  });
}

export const tracks = sqliteTable(
  "tracks",
  {
    id: text("id").primaryKey().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    tags: text("tags").notNull().default("[]"),
    audioFile: text("audio_file").notNull(),
    artworkFile: text("artwork_file").notNull(),
    waveformPreview: text("waveform_preview").notNull(),
    duration: real("duration").notNull(),
    slug: text("slug").notNull().unique(),
    links: text("links").notNull().default("{}"),
    recordedAt: integer("recorded_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("idx_tracks_title").on(t.title),
    index("idx_tracks_tags").on(t.tags),
  ],
);
