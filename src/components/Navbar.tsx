import { AuthStatus } from "@/components/AuthStatus";
import { APP_TITLE } from "@/config";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="navbar">
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
