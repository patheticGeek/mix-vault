export default function LoginPage() {
  return (
    <div className="hero min-h-screen bg-base-100 text-base-content">
      <div className="hero-content flex-col w-full max-w-md gap-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Sign in</h1>
          <p className="text-sm text-base-content/70">
            Enter your email and password to access Mix Vault.
          </p>
        </div>

        <form className="w-full">
          <div className="form-control mb-4">
            <label className="label" htmlFor="email">
              <span className="label-text">Email</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
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
              placeholder="••••••••"
              className="input input-bordered w-full"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
