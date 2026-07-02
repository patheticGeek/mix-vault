import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow } from "@/lib/db/schema";
import { Hono } from "hono";

export const tracksRouter = new Hono();

tracksRouter.get("/", async (c) => {
  const db = getDb();
  const rows = await db.select().from(tracks);
  return c.json(rows.map(normalizeTrackRow));
});
