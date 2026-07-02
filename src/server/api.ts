import { Hono } from "hono";
import { tracksRouter } from "./routes/tracks";

export const app = new Hono<{ Bindings: Cloudflare.Env }>().basePath("/api");

app.route("/tracks", tracksRouter);

app.get("/(.*)", () => {
  return new Response("Not Found", { status: 404 });
});

export type App = typeof app;

export default app;
