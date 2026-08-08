import { TrackPageClient } from "@/app/track/[slug]/TrackPageClient";
import { APP_TITLE } from "@/config";
import { getServerSession } from "@/lib/auth/getServerSession";
import type { TrackBySlugResponse } from "@/hooks/queries/useTrackBySlug";
import { assetUrl } from "@/lib/cdn";
import { getDb, tracks } from "@/lib/db";
import { normalizeTrackRow } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cache } from "react";

// cache() dedupes this within a single request, so generateMetadata and the
// page body below share one DB query instead of two. Private tracks are only
// resolved for a logged-in visitor — for anyone else they read as "not found"
// (both here and in the client fetch), so the content never renders or leaks
// into page metadata.
const getTrackBySlug = cache(async (slug: string) => {
  const db = getDb();
  const [row] = await db.select().from(tracks).where(eq(tracks.slug, slug)).limit(1);
  if (!row) return null;
  if (row.status === "private" && !(await getServerSession())) return null;
  return row;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);

  if (!track) {
    return { title: `Track not found · ${APP_TITLE}` };
  }

  const title = `${track.title} · ${APP_TITLE}`;
  const description = track.description || APP_TITLE;
  const imageUrl = assetUrl(track.artworkFile);

  return {
    title,
    description,
    // Only public tracks should be indexed. Unlisted tracks are meant to be
    // reachable by link but kept out of search results; private ones only
    // resolve for a logged-in visitor at all, but tell crawlers not to index
    // them regardless.
    ...(track.status === "public" ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl }],
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getTrackBySlug(slug);

  // Serialized to match the shape the client's own fetch would get back
  // over JSON (dates as strings), so react-query can use this as
  // initialData instead of the client re-fetching on mount — this is what
  // gets the actual track content (not just a loading spinner) into the
  // first server-rendered response for crawlers.
  const initialTrack: TrackBySlugResponse | null = row
    ? (JSON.parse(JSON.stringify(normalizeTrackRow(row))) as TrackBySlugResponse)
    : null;

  return <TrackPageClient slug={slug} initialTrack={initialTrack} />;
}
