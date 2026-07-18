// Matches keys produced by trackAssetKey(): tracks/{uuid}/{sha256 hex}{ext}
export const TRACK_ASSET_KEY_RE =
  /^tracks\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{64}(\.[A-Za-z0-9]+)?$/;

export function trackAssetKey(trackId: string, contentHash: string, ext: string): string {
  return `tracks/${trackId}/${contentHash}${ext}`;
}
