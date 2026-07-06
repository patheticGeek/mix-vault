import { verifySessionToken } from "@/lib/auth/jwt";
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
