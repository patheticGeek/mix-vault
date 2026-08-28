import { hc } from "hono/client";
import type { App } from "@/server/api";

export const apiClient = hc<App>("/");
