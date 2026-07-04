"use client";

import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

const loginEndpoint = apiClient.api.auth.login.$post;

type LoginRequest = InferRequestType<typeof loginEndpoint>["json"];
type LoginSuccess = InferResponseType<typeof loginEndpoint, 200>;

async function login(credentials: LoginRequest): Promise<LoginSuccess> {
  const res = await loginEndpoint({ json: credentials });
  const data: unknown = await res.json();
  if (!res.ok) {
    const hasErrorMessage = data && typeof data === "object" && "error" in data && typeof data.error === "string";
    throw new Error(hasErrorMessage ? (data as { error: string }).error : "Login failed");
  }
  return data as LoginSuccess;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}
