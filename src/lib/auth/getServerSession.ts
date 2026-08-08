import { verifySessionToken, type SessionPayload } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { cookies } from "next/headers";

// Reads and verifies the session cookie inside a React Server Component /
// route handler (where `hono`'s Context isn't available). Used by SSR pages
// that must not render private tracks to logged-out visitors.
export async function getServerSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? await verifySessionToken(token) : null;
}
