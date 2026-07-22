import { AuthStatus } from "@/components/AuthStatus";
import { APP_TITLE } from "@/config";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="navbar sticky top-0 z-50 bg-base-100/70 backdrop-blur-md border-b border-base-content/10">
      <div className="navbar-start">
        <Link href="/" className="btn btn-ghost normal-case">
          {APP_TITLE}
        </Link>
      </div>
      <div className="navbar-end">
        <AuthStatus />
      </div>
    </header>
  );
}
