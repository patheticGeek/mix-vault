import { requireAuth } from "@/lib/auth/session";
import { abortMultipartUpload, completeMultipartUpload, createMultipartUpload, presignUploadPart } from "@/lib/r2S3";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
}

const createUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().optional(),
  partCount: z.number().int().min(1).max(10000),
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
      const { filename, contentType, partCount } = c.req.valid("json");
      const key = `tracks/audio/${crypto.randomUUID()}${extensionOf(filename)}`;

      try {
        const uploadId = await createMultipartUpload(key, contentType);
        const parts = await Promise.all(
          Array.from({ length: partCount }, (_, i) => i + 1).map(async (partNumber) => ({
            partNumber,
            url: await presignUploadPart(key, uploadId, partNumber),
          })),
        );

        return c.json({ key, uploadId, parts }, 201);
      } catch (err) {
        console.error("Failed to start audio upload", err);
        return c.json({ error: "Failed to start audio upload" }, 500);
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

      try {
        await completeMultipartUpload(key, uploadId, parts);
        return c.json({ key });
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

      try {
        await abortMultipartUpload(key, uploadId);
      } catch (err) {
        console.error("Failed to abort multipart upload", err);
      }
      return c.body(null, 204);
    },
  );
