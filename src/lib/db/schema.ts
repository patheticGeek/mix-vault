import { parseTrackLinks } from "@/lib/trackLinks";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

// Fields shared by every track representation the API returns. It
// deliberately omits `description` and `waveformPreview` — both are heavy, so
// the list endpoint returns only these lightweight fields, the single-track
// endpoints add `description`, and the waveform is fetched on its own (see the
// /:id/waveform route).
const trackBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  audioFile: z.string(),
  artworkFile: z.string(),
  duration: z.number(),
  slug: z.string(),
  links: z.record(z.string(), z.string()),
  recordedAt: z.date().nullable(),
  createdAt: z.date(),
});

// The lightweight "summary" shape returned by the track list endpoint.
export const trackSummarySchema = trackBaseSchema;
export type TrackSummary = z.infer<typeof trackSummarySchema>;

// The single-track shape: the summary plus the description. Still no waveform
// (that's a separate call).
export const trackSchema = trackBaseSchema.extend({
  description: z.string(),
});
export type Track = z.infer<typeof trackSchema>;

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "string") return new Date(value);
  return null;
}

// Shared coercion of the raw DB row (JSON-string tags/links, epoch/ISO dates)
// into the normalized field values every track shape uses. The caller's
// zod schema then strips any columns that shape doesn't include.
function normalizeCommon(raw: unknown): Record<string, unknown> {
  const row = raw as Record<string, unknown>;
  const tagsValue = row.tags;

  return {
    ...row,
    tags:
      typeof tagsValue === "string"
        ? JSON.parse(tagsValue)
        : Array.isArray(tagsValue)
          ? tagsValue
          : [],
    links: parseTrackLinks(row.links),
    createdAt: toDate(row.createdAt) ?? new Date(),
    recordedAt: toDate(row.recordedAt),
  };
}

export function normalizeTrackSummary(raw: unknown): TrackSummary {
  return trackSummarySchema.parse(normalizeCommon(raw));
}

export function normalizeTrackRow(raw: unknown): Track {
  return trackSchema.parse(normalizeCommon(raw));
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
