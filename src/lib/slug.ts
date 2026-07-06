import { getDb, tracks } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const db = getDb();
  const slugBase = slugify(base) || "track";

  let candidate = slugBase;
  let suffix = 2;
  while (true) {
    const existing = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(
        excludeId
          ? and(eq(tracks.slug, candidate), ne(tracks.id, excludeId))
          : eq(tracks.slug, candidate),
      )
      .limit(1);
    if (existing.length === 0) return candidate;
    candidate = `${slugBase}-${suffix}`;
    suffix += 1;
  }
}
