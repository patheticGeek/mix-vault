import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const trackSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  type: z.enum(["song", "dj_mix"]),
  description: z.string(),
  file: z.string(),
  image: z.string(),
  waveformPreview: z.string(),
  slug: z.string(),
  tags: z.array(z.string()),
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
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt
        : typeof row.createdAt === "number"
          ? new Date(row.createdAt)
          : typeof row.createdAt === "string"
            ? new Date(row.createdAt)
            : new Date(),
  });
}

export const tracks = sqliteTable(
  "tracks",
  {
    id: integer("id").primaryKey().notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    file: text("file").notNull(),
    image: text("image").notNull(),
    waveformPreview: text("waveform_preview").notNull(),
    slug: text("slug").notNull().unique(),
    tags: text("tags").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("idx_tracks_title").on(t.title),
    index("idx_tracks_type").on(t.type),
    index("idx_tracks_tags").on(t.tags),
  ],
);
