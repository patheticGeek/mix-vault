// The only platforms a track link can point to. Extend this (and the icon
// mapping in @/config) to support more. Kept separate from @/lib/db/schema
// so client components can import it without pulling in the drizzle schema.
export const TRACK_LINK_KEYS = ["soundcloud", "youtube"] as const;
export type TrackLinkKey = (typeof TRACK_LINK_KEYS)[number];
export type TrackLinks = Partial<Record<TrackLinkKey, string>>;

// Shared by both directions: reading the stored JSON column back out, and
// parsing the JSON string a form submits. Silently drops anything that
// isn't a known key with a non-empty string value rather than erroring —
// links are optional and low-stakes either way.
export function parseTrackLinks(raw: unknown): TrackLinks {
  const value = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (typeof value !== "object" || value === null) return {};

  const links: TrackLinks = {};
  for (const key of TRACK_LINK_KEYS) {
    const link = (value as Record<string, unknown>)[key];
    if (typeof link === "string" && link.trim()) links[key] = link.trim();
  }
  return links;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
