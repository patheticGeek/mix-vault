import { TrackPageClient } from "@/app/track/[slug]/TrackPageClient";
import { APP_TITLE } from "@/config";
import { assetUrl } from "@/lib/cdn";
import { getDb, tracks } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";

async function getTrackBySlug(slug: string) {
  const db = getDb();
  const [row] = await db.select().from(tracks).where(eq(tracks.slug, slug)).limit(1);
  return row ?? null;
}

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
  return <TrackPageClient slug={slug} />;
}
