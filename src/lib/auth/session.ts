import { verifySessionToken, type SessionPayload } from "@/lib/auth/jwt";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

export const SESSION_COOKIE_NAME = "session";

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Reads and verifies the session cookie without rejecting the request when
// it's missing/invalid — for endpoints that are reachable both logged in and
// logged out but behave differently (e.g. hiding private tracks from anons).
export async function getOptionalSession(c: Context): Promise<SessionPayload | null> {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  return token ? await verifySessionToken(token) : null;
}
