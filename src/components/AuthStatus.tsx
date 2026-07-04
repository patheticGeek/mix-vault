"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import Link from "next/link";

export function AuthStatus() {
  const { user, isLoading, isLoggingOut, logout } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return (
      <Link href="/login" className="btn btn-ghost btn-sm">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/admin" className="text-sm text-base-content/70 hover:underline">
        {user.username}
      </Link>
      <button onClick={() => logout()} disabled={isLoggingOut} className="btn btn-ghost btn-sm">
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
