import { requireAuth } from "@/lib/auth/session";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow } from "@/lib/db/schema";
import { ensureUniqueSlug } from "@/lib/slug";
import { zValidator } from "@hono/zod-validator";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
}

const createTrackSchema = z.object({
  title: z.string({ error: "Title is required" }).min(1, "Title is required"),
  description: z.string({ error: "Description is required" }).min(1, "Description is required"),
  tags: z.string().optional(),
  slug: z.string().optional(),
  audioFileKey: z
    .string({ error: "Audio file is required" })
    .min(1, "Audio file is required")
    .refine((key) => key.startsWith("tracks/audio/"), "Invalid audio file"),
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
});

const updateTrackSchema = z.object({
  title: z.string({ error: "Title is required" }).min(1, "Title is required"),
  description: z.string({ error: "Description is required" }).min(1, "Description is required"),
  tags: z.string().optional(),
  slug: z.string().optional(),
  artworkFile: z
    .instanceof(File, { message: "Invalid artwork file" })
    .refine((file) => file.size > 0, "Artwork file must not be empty")
    .optional(),
  recordedAt: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
});

export const tracksRouter = new Hono()
  .get("/", async (c) => {
    const db = getDb();
    const rows = await db.select().from(tracks).orderBy(desc(tracks.createdAt));
    return c.json(rows.map(normalizeTrackRow));
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = getDb();
    const [row] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
    if (!row) return c.json({ error: "Track not found" }, 404);
    return c.json(normalizeTrackRow(row));
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
        title,
        description,
        tags: tagsInput,
        slug: slugInput,
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

      const id = crypto.randomUUID();
      const artworkFileKey = `tracks/artwork/${id}${extensionOf(artworkFile.name)}`;

      await context.env.MIX_VAULT_R2.put(artworkFileKey, await artworkFile.arrayBuffer(), {
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
      const { title, description, tags: tagsInput, slug: slugInput, artworkFile, recordedAt } = c.req.valid("form");

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

      let artworkFileKey = existing.artworkFile;
      if (artworkFile) {
        const context = getCloudflareContext();
        const newArtworkFileKey = `tracks/artwork/${id}${extensionOf(artworkFile.name)}`;
        await context.env.MIX_VAULT_R2.put(newArtworkFileKey, await artworkFile.arrayBuffer(), {
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
          artworkFile: artworkFileKey,
          recordedAt,
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
