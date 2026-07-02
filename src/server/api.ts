import { Hono } from "hono";
import { tracksRouter } from "./routes/tracks";

export const app = new Hono().basePath("/api");

app.use("*", async (c, next) => {
  try {
    await next();
  } catch (err) {
    console.error(`Unhandled error in ${c.req.method} ${c.req.path}:`, err);
    throw err;
  }
});

app.route("/tracks", tracksRouter);

app.get("/(.*)", () => {
  return new Response("Not Found", { status: 404 });
});

export type App = typeof app;

export default app;
