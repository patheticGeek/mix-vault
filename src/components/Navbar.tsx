"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { AuthStatus } from "@/components/AuthStatus";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { APP_TITLE } from "@/config";

export function Navbar() {
  return (
    <header className="navbar sticky top-0 z-50 bg-base-100/70 backdrop-blur-md border-b border-base-content/10">
      <div className="navbar-start">
        <Link href="/" className="btn btn-ghost normal-case">
          {APP_TITLE}
        </Link>
      </div>
      <div className="navbar-end gap-1">
        <Link
          href="/downloads"
          aria-label="Downloads"
          title="Downloads"
          className="btn btn-ghost btn-square normal-case"
        >
          <Download className="w-5 h-5" />
        </Link>
        <ThemeSwitcher />
        <AuthStatus />
      </div>
    </header>
  );
}
