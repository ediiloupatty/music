"use client";

import Link from "next/link";
import { useEffect } from "react";

// Route error boundary. Catches render/data errors in the page tree and offers a
// retry (re-runs the failed segment) plus a way home — instead of a blank crash.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: "rgba(244,63,94,0.15)" }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-black mb-2">Something went wrong</h1>
        <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
          We couldn&apos;t load this page. The music server may be busy — please try again.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "var(--accent)" }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:bg-white/5 active:scale-95"
          style={{ border: "1px solid var(--border-card)", color: "var(--text-secondary)" }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}
