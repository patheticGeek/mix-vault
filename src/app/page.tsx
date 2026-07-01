export default function Home() {
  return (
    <div className="bg-base-100 text-base-content">
      <header className="navbar">
        <div className="navbar-start">
          <a className="btn btn-ghost normal-case">Mix Vault</a>
        </div>
      </header>

      <main className="hero min-h-[calc(100vh-4rem)]">
        <div className="hero-content flex-col text-center gap-8">
          <div>
            <h1 className="text-5xl font-bold">Mix Vault</h1>
            <p className="py-4 max-w-xl mx-auto">
              A minimal creative vault inspired by modern audio platforms: calm,
              dark, and focused.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
