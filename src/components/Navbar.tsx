import { AuthStatus } from "@/components/AuthStatus";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-start">
        <a href="/" className="btn btn-ghost normal-case">
          Mix Vault
        </a>
      </div>
      <div className="navbar-end">
        <AuthStatus />
      </div>
    </header>
  );
}
