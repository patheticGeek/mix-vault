"use client";

import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

const meEndpoint = apiClient.api.auth.me.$get;

type MeResponse = InferResponseType<typeof meEndpoint>;
export type CurrentUser = MeResponse["user"];

async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await meEndpoint();
  const data = (await res.json()) as MeResponse;
  return data.user;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
  });
}
