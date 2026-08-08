import { getOptionalSession, requireAuth } from "@/lib/auth/session";
import { sha256Hex } from "@/lib/contentHash";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow, normalizeTrackSummary, trackStatusSchema } from "@/lib/db/schema";
import { ensureUniqueSlug } from "@/lib/slug";
import { parseTrackLinks } from "@/lib/trackLinks";
import { trackAssetKey } from "@/lib/trackAssetKey";
import { zValidator } from "@hono/zod-validator";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
}

// Whether the current request may open a single track. Public and unlisted
// tracks are openable by anyone with the link; private tracks require a valid
// session. Callers treat `false` as a 404 so a private track's existence isn't
// revealed to anonymous visitors.
async function canView(c: Parameters<typeof getOptionalSession>[0], status: string): Promise<boolean> {
  if (status !== "private") return true;
  return Boolean(await getOptionalSession(c));
}

const createTrackSchema = z
  .object({
    trackId: z.string().uuid("Invalid track id"),
    title: z.string({ error: "Title is required" }).min(1, "Title is required"),
    description: z.string({ error: "Description is required" }).min(1, "Description is required"),
    tags: z.string().optional(),
    slug: z.string().optional(),
    status: trackStatusSchema.optional(),
    links: z.string().optional(),
    audioFileKey: z.string({ error: "Audio file is required" }).min(1, "Audio file is required"),
    artworkFile: z
      .instanceof(File, { message: "Artwork file is required" })
      .refine((file) => file.size > 0, "Artwork file is required"),
    waveformPreview: z.string({ error: "Waveform preview is required" }).min(1, "Waveform preview is required"),
    duration: z
      .string({ error: "Duration is required" })
      .transform((value) => Number(value))
      .refine((value) => Number.isFinite(value) && value > 0, "Duration is required"),
    recordedAt: z
      .string()
      .optional()
      .transform((value) => (value ? new Date(value) : null)),
  })
  .refine((data) => data.audioFileKey.startsWith(`tracks/${data.trackId}/`), {
    message: "Invalid audio file",
    path: ["audioFileKey"],
  });

const updateTrackSchema = z.object({
  title: z.string({ error: "Title is required" }).min(1, "Title is required"),
  description: z.string({ error: "Description is required" }).min(1, "Description is required"),
  tags: z.string().optional(),
  slug: z.string().optional(),
  status: trackStatusSchema.optional(),
  links: z.string().optional(),
  artworkFile: z
    .instanceof(File, { message: "Invalid artwork file" })
    .refine((file) => file.size > 0, "Artwork file must not be empty")
    .optional(),
  recordedAt: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
});

// The lightweight columns the list endpoint returns — everything except the
// heavy `description` and `waveformPreview`, which are fetched per-track.
const summaryColumns = {
  id: tracks.id,
  title: tracks.title,
  tags: tracks.tags,
  audioFile: tracks.audioFile,
  artworkFile: tracks.artworkFile,
  duration: tracks.duration,
  slug: tracks.slug,
  status: tracks.status,
  links: tracks.links,
  recordedAt: tracks.recordedAt,
  createdAt: tracks.createdAt,
} as const;

// The single-track columns: the summary plus `description`, but still without
// `waveformPreview` (served on its own by the /:id/waveform route).
const detailColumns = {
  ...summaryColumns,
  description: tracks.description,
} as const;

export const tracksRouter = new Hono()
  .get(
    "/",
    zValidator("query", z.object({ scope: z.enum(["public", "all"]).optional() })),
    async (c) => {
      // The homepage only ever lists public tracks. The admin passes
      // `scope=all` to manage unlisted/private ones too — but that's only
      // honored for a logged-in request, so it can never leak hidden tracks.
      const { scope } = c.req.valid("query");
      const session = scope === "all" ? await getOptionalSession(c) : null;
      const includeAll = scope === "all" && Boolean(session);

      const db = getDb();
      const query = db.select(summaryColumns).from(tracks);
      const rows = await (includeAll ? query : query.where(eq(tracks.status, "public"))).orderBy(
        desc(tracks.createdAt),
      );
      return c.json(rows.map(normalizeTrackSummary));
    },
  )
  .get("/slug/:slug", async (c) => {
    const slug = c.req.param("slug");
    const db = getDb();
    const [row] = await db.select(detailColumns).from(tracks).where(eq(tracks.slug, slug)).limit(1);
    if (!row || !(await canView(c, row.status))) return c.json({ error: "Track not found" }, 404);
    return c.json(normalizeTrackRow(row));
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = getDb();
    const [row] = await db.select(detailColumns).from(tracks).where(eq(tracks.id, id)).limit(1);
    if (!row || !(await canView(c, row.status))) return c.json({ error: "Track not found" }, 404);
    return c.json(normalizeTrackRow(row));
  })
  .get("/:id/waveform", async (c) => {
    const id = c.req.param("id");
    const db = getDb();
    const [row] = await db
      .select({ waveformPreview: tracks.waveformPreview, status: tracks.status })
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);
    if (!row || !(await canView(c, row.status))) return c.json({ error: "Track not found" }, 404);
    return c.json({ waveformPreview: row.waveformPreview });
  })
  .post(
    "/",
    requireAuth,
    zValidator("form", createTrackSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, 400);
      }
    }),
    async (c) => {
      const {
        trackId,
        title,
        description,
        tags: tagsInput,
        slug: slugInput,
        status,
        links: linksInput,
        audioFileKey,
        artworkFile,
        waveformPreview,
        duration,
        recordedAt,
      } = c.req.valid("form");

      const context = getCloudflareContext();
      const audioObject = await context.env.MIX_VAULT_R2.head(audioFileKey);
      if (!audioObject) {
        return c.json({ error: "Audio file upload not found. Please try uploading again." }, 400);
      }

      const tags = tagsInput
        ? tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const slug = await ensureUniqueSlug(slugInput?.trim() ? slugInput : title);
      const links = parseTrackLinks(linksInput);

      const id = trackId;
      const artworkBuffer = await artworkFile.arrayBuffer();
      const artworkHash = await sha256Hex(artworkBuffer);
      const artworkFileKey = trackAssetKey(id, artworkHash, extensionOf(artworkFile.name));

      await context.env.MIX_VAULT_R2.put(artworkFileKey, artworkBuffer, {
        httpMetadata: { contentType: artworkFile.type || undefined },
      });

      const db = getDb();
      const [row] = await db
        .insert(tracks)
        .values({
          id,
          title: title.trim(),
          description,
          tags: JSON.stringify(tags),
          audioFile: audioFileKey,
          artworkFile: artworkFileKey,
          waveformPreview,
          duration,
          recordedAt,
          slug,
          status: status ?? "public",
          links: JSON.stringify(links),
        })
        .returning();

      return c.json(normalizeTrackRow(row), 201);
    },
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("form", updateTrackSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, 400);
      }
    }),
    async (c) => {
      const id = c.req.param("id");
      const {
        title,
        description,
        tags: tagsInput,
        slug: slugInput,
        status,
        links: linksInput,
        artworkFile,
        recordedAt,
      } = c.req.valid("form");

      const db = getDb();
      const [existing] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
      if (!existing) return c.json({ error: "Track not found" }, 404);

      const tags = tagsInput
        ? tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const slug =
        slugInput?.trim() && slugInput.trim() !== existing.slug
          ? await ensureUniqueSlug(slugInput, id)
          : existing.slug;
      const links = parseTrackLinks(linksInput);

      let artworkFileKey = existing.artworkFile;
      if (artworkFile) {
        const context = getCloudflareContext();
        const artworkBuffer = await artworkFile.arrayBuffer();
        const artworkHash = await sha256Hex(artworkBuffer);
        const newArtworkFileKey = trackAssetKey(id, artworkHash, extensionOf(artworkFile.name));
        await context.env.MIX_VAULT_R2.put(newArtworkFileKey, artworkBuffer, {
          httpMetadata: { contentType: artworkFile.type || undefined },
        });
        if (newArtworkFileKey !== existing.artworkFile) {
          await context.env.MIX_VAULT_R2.delete(existing.artworkFile);
        }
        artworkFileKey = newArtworkFileKey;
      }

      const [row] = await db
        .update(tracks)
        .set({
          title: title.trim(),
          description,
          tags: JSON.stringify(tags),
          slug,
          ...(status ? { status } : {}),
          artworkFile: artworkFileKey,
          recordedAt,
          links: JSON.stringify(links),
        })
        .where(eq(tracks.id, id))
        .returning();

      return c.json(normalizeTrackRow(row), 200);
    },
  )
  .delete("/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    const db = getDb();
    const [existing] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
    if (!existing) return c.json({ error: "Track not found" }, 404);

    const context = getCloudflareContext();
    await Promise.all([
      context.env.MIX_VAULT_R2.delete(existing.audioFile),
      context.env.MIX_VAULT_R2.delete(existing.artworkFile),
    ]);

    await db.delete(tracks).where(eq(tracks.id, id));

    return c.body(null, 204);
  });
