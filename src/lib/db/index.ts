import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { tracks } from "./schema";

export type Db = ReturnType<typeof getDb>;

export function getDb() {
  const context = getCloudflareContext();
  return drizzle(context.env.MIX_VAULT_DB);
}

export { tracks };
