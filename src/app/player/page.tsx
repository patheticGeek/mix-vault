import { PlayerPageClient } from "@/app/player/PlayerPageClient";
import { APP_TITLE } from "@/config";
import type { TrackSummary } from "@/hooks/queries/useListTracks";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Player · ${APP_TITLE}`,
};

// getDb() needs the Cloudflare request context, which isn't available at
// build time — render per-request instead of statically prerendering.
export const dynamic = "force-dynamic";

// A slug-free "now playing" view: it reflects the shared player's current
// track and offers the full track list as a queue to play through.
export default async function PlayerPage() {
  const db = getDb();
  const rows = await db.select().from(tracks).orderBy(desc(tracks.createdAt));

  // Serialized to match the shape the client's own fetch would get back over
  // JSON, so react-query treats it the same as data it fetched itself.
  const initialTracks: TrackSummary[] = JSON.parse(
    JSON.stringify(rows.map(normalizeTrackRow)),
  );

  return <PlayerPageClient initialTracks={initialTracks} />;
}
