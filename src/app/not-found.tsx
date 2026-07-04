import Link from "next/link";

export default function NotFound() {
  return (
    <div className="hero min-h-[calc(100vh-4rem)] bg-base-100 text-base-content">
      <div className="hero-content text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-5xl font-bold">404</h1>
          <p className="text-base-content/70">
            This page was not found, but you know what can be? Great music!{" "}
            <Link href="/" className="text-blue-500 underline hover:text-blue-400">
              Go to the homepage to see &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
