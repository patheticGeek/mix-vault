import { HomeClient } from "@/app/HomeClient";
import type { TrackSummary } from "@/hooks/queries/useListTracks";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const RECENT_TRACKS_SSR_COUNT = 5;

export default async function Home() {
  const db = getDb();
  const rows = await db
    .select()
    .from(tracks)
    .orderBy(desc(tracks.createdAt))
    .limit(RECENT_TRACKS_SSR_COUNT);

  // Serialized to match the shape the client's own fetch would get back
  // over JSON (dates as strings), so react-query can use this as
  // initialData instead of the client showing a loading spinner for data
  // that's already there.
  const initialTracks: TrackSummary[] = JSON.parse(
    JSON.stringify(rows.map(normalizeTrackRow)),
  );

  return <HomeClient initialTracks={initialTracks} />;
}
