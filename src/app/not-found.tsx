import Link from "next/link";

// Global 404 for unmatched routes and notFound() calls.
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <h1 className="text-6xl font-black" style={{ color: "var(--accent)" }}>
        404
      </h1>
      <div>
        <h2 className="text-xl font-black mb-2">Page not found</h2>
        <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: "var(--accent)" }}
      >
        Back to Home
      </Link>
    </div>
  );
}
