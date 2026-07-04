"use client";

import { useLogin } from "@/hooks/mutations/useLogin";
import { useLogout } from "@/hooks/mutations/useLogout";
import { useCurrentUser } from "./useCurrentUser";

export function useAuth() {
  const { data: user, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isLoading,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    login: (username: string, password: string) => loginMutation.mutateAsync({ username, password }),
    logout: () => logoutMutation.mutateAsync(),
  };
}
