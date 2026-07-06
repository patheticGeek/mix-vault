import { verifyCredentials } from "@/lib/auth/credentials";
import { SESSION_MAX_AGE_SECONDS, signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = new Hono()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { username, password } = c.req.valid("json");

    const isValid = await verifyCredentials(username, password);
    if (!isValid) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    const token = await signSessionToken({ username });
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return c.json({ user: { username } });
  })
  .post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", async (c) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return c.json({ user: null }, 401);
    }
    return c.json({ user: { username: session.username } });
  });
