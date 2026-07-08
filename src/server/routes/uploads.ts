import { requireAuth } from "@/lib/auth/session";
import { zValidator } from "@hono/zod-validator";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Hono } from "hono";
import { z } from "zod";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
}

const createUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().optional(),
});

const partQuerySchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  partNumber: z.coerce.number().int().min(1).max(10000),
});

const completeSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) }))
    .min(1, "At least one part is required"),
});

const abortSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

export const uploadsRouter = new Hono()
  .post(
    "/audio",
    requireAuth,
    zValidator("json", createUploadSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, 400);
      }
    }),
    async (c) => {
      const { filename, contentType } = c.req.valid("json");
      const key = `tracks/audio/${crypto.randomUUID()}${extensionOf(filename)}`;

      const context = getCloudflareContext();
      const upload = await context.env.MIX_VAULT_R2.createMultipartUpload(key, {
        httpMetadata: contentType ? { contentType } : undefined,
      });

      return c.json({ key: upload.key, uploadId: upload.uploadId }, 201);
    },
  )
  .put(
    "/audio/part",
    requireAuth,
    zValidator("query", partQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, 400);
      }
    }),
    async (c) => {
      const { key, uploadId, partNumber } = c.req.valid("query");
      if (!key.startsWith("tracks/audio/")) {
        return c.json({ error: "Invalid upload key" }, 400);
      }

      const body = await c.req.arrayBuffer();
      if (body.byteLength === 0) {
        return c.json({ error: "Empty part" }, 400);
      }

      const context = getCloudflareContext();
      const upload = context.env.MIX_VAULT_R2.resumeMultipartUpload(key, uploadId);
      try {
        const part = await upload.uploadPart(partNumber, body);
        return c.json({ partNumber: part.partNumber, etag: part.etag });
      } catch (err) {
        console.error("Failed to upload part", err);
        return c.json({ error: "Failed to upload audio file part" }, 500);
      }
    },
  )
  .post(
    "/audio/complete",
    requireAuth,
    zValidator("json", completeSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, 400);
      }
    }),
    async (c) => {
      const { key, uploadId, parts } = c.req.valid("json");
      if (!key.startsWith("tracks/audio/")) {
        return c.json({ error: "Invalid upload key" }, 400);
      }

      const context = getCloudflareContext();
      const upload = context.env.MIX_VAULT_R2.resumeMultipartUpload(key, uploadId);
      try {
        const object = await upload.complete(parts);
        return c.json({ key: object.key });
      } catch (err) {
        console.error("Failed to complete multipart upload", err);
        return c.json({ error: "Failed to finish audio upload" }, 500);
      }
    },
  )
  .delete(
    "/audio",
    requireAuth,
    zValidator("json", abortSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, 400);
      }
    }),
    async (c) => {
      const { key, uploadId } = c.req.valid("json");
      if (!key.startsWith("tracks/audio/")) {
        return c.json({ error: "Invalid upload key" }, 400);
      }

      const context = getCloudflareContext();
      const upload = context.env.MIX_VAULT_R2.resumeMultipartUpload(key, uploadId);
      try {
        await upload.abort();
      } catch (err) {
        console.error("Failed to abort multipart upload", err);
      }
      return c.body(null, 204);
    },
  );
