import { Hono } from "hono";
import { authRouter } from "./routes/auth";
import { tracksRouter } from "./routes/tracks";
import { uploadsRouter } from "./routes/uploads";

export const app = new Hono()
  .basePath("/api")
  .use("*", async (c, next) => {
    try {
      await next();
    } catch (err) {
      console.error(`Unhandled error in ${c.req.method} ${c.req.path}:`, err);
      throw err;
    }
  })
  .route("/auth", authRouter)
  .route("/tracks", tracksRouter)
  .route("/uploads", uploadsRouter)
  .get("/(.*)", () => {
    return new Response("Not Found", { status: 404 });
  });

export type App = typeof app;

export default app;
