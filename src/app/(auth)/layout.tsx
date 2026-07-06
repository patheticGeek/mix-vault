"use client";

import { RequireAuth } from "@/components/RequireAuth";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
