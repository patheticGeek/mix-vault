import { AuthStatus } from "@/components/AuthStatus";
import { APP_TITLE } from "@/config";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-start">
        <a href="/" className="btn btn-ghost normal-case">
          {APP_TITLE}
        </a>
      </div>
      <div className="navbar-end">
        <AuthStatus />
      </div>
    </header>
  );
}
