"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(username, password);
      router.push("/admin");
    } catch {
      // loginError from useAuth already reflects the failure
    }
  }

  return (
    <div className="hero min-h-[calc(100vh-4rem)] bg-base-100 text-base-content">
      <div className="hero-content flex-col w-full max-w-md gap-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Sign in</h1>
          <p className="text-sm text-base-content/70">
            Enter your username and password to access Mix Vault.
          </p>
        </div>

        <form className="w-full" onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label" htmlFor="username">
              <span className="label-text">Username</span>
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control mb-6">
            <label className="label" htmlFor="password">
              <span className="label-text">Password</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          {loginError && (
            <p className="text-error text-sm mb-4" role="alert">
              {loginError}
            </p>
          )}

          <button type="submit" disabled={isLoggingIn} className="btn btn-primary w-full">
            {isLoggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
