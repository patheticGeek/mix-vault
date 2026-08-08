import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { tracks } from "@/lib/db/schema";

// Adds `X-Robots-Tag: noindex, nofollow` to non-public track pages, the HTTP
// counterpart to the `robots` meta tag set in the track page's metadata.
// Public tracks are left untouched so they stay indexable. Anything else
// (unlisted, private) is meant to be reachable by link but kept out of search
// results, and the header covers crawlers that skip the HTML meta tag.
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const slug = request.nextUrl.pathname.replace(/^\/track\//, "");
  if (!slug) return response;

  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.MIX_VAULT_DB);
    const [row] = await db
      .select({ status: tracks.status })
      .from(tracks)
      .where(eq(tracks.slug, slug))
      .limit(1);

    if (row && row.status !== "public") {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  } catch {
    // Never let a DB hiccup block the page — just skip the header.
  }

  return response;
}

export const config = {
  matcher: "/track/:slug",
};
