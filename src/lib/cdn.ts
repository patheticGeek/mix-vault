const CDN_BASE_URL = "https://cdn.mix-vault.pgd.sh";

export function assetUrl(key: string): string {
  return `${CDN_BASE_URL}/${key}`;
}
