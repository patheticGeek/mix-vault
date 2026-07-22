"use client";

import { AuthStatus } from "@/components/AuthStatus";
import { APP_TITLE } from "@/config";
import { AudioLines } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  // The full-page player is a full-bleed, chrome-free experience — no navbar.
  const pathname = usePathname();
  if (pathname === "/player") return null;

  return (
    <header className="navbar sticky top-0 z-50 bg-base-100/70 backdrop-blur-md border-b border-base-content/10">
      <div className="navbar-start">
        <Link href="/" className="btn btn-ghost normal-case">
          {APP_TITLE}
        </Link>
      </div>
      <div className="navbar-end gap-1">
        <Link
          href="/player"
          aria-label="Open player"
          title="Player"
          className="btn btn-ghost btn-circle"
        >
          <AudioLines className="w-5 h-5" />
        </Link>
        <AuthStatus />
      </div>
    </header>
  );
}
