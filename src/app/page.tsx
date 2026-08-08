import { HomeClient } from "@/app/HomeClient";
import type { TrackSummary } from "@/hooks/queries/useListTracks";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackSummary } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

const RECENT_TRACKS_LIMIT = 5;

// getDb() needs the Cloudflare request context, which isn't available at
// build time — force this route to render per-request instead of being
// statically prerendered.
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getDb();
  // Only public tracks — this must match what the client's `useListTracks()`
  // fetch returns (scope defaults to "public"), otherwise unlisted/private
  // tracks would flash in the SSR HTML and then disappear on hydration.
  const rows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.status, "public"))
    .orderBy(desc(tracks.createdAt))
    .limit(RECENT_TRACKS_LIMIT);

  // Serialized to match the shape the client's own fetch would get back
  // over JSON (dates as strings), so react-query can treat this the same
  // as data it fetched itself once the client-side query resolves.
  const initialTracks: TrackSummary[] = JSON.parse(
    JSON.stringify(rows.map(normalizeTrackSummary)),
  );

  return <HomeClient initialTracks={initialTracks} />;
}
