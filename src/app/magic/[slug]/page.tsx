import { MagicPageClient } from "@/app/magic/[slug]/MagicPageClient";
import { APP_TITLE } from "@/config";
import type { TrackBySlugResponse } from "@/hooks/queries/useTrackBySlug";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cache } from "react";

// Dedupes the lookup across generateMetadata and the page body within a
// single request (same pattern as the /track/[slug] page).
const getTrackBySlug = cache(async (slug: string) => {
  const db = getDb();
  const [row] = await db.select().from(tracks).where(eq(tracks.slug, slug)).limit(1);
  return row ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  const title = track ? `${track.title} · Magic Player · ${APP_TITLE}` : `Magic Player · ${APP_TITLE}`;
  return { title };
}

export default async function MagicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getTrackBySlug(slug);

  // Serialized to match the client's own fetch shape so react-query can use
  // it as initialData instead of re-fetching on mount.
  const initialTrack: TrackBySlugResponse | null = row
    ? (JSON.parse(JSON.stringify(normalizeTrackRow(row))) as TrackBySlugResponse)
    : null;

  return <MagicPageClient slug={slug} initialTrack={initialTrack} />;
}
