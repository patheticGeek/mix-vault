import type { App } from "@/server/api";
import { hc } from "hono/client";

export const apiClient = hc<App>("/");
