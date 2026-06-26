import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DynamicBackground from "@/components/DynamicBackground";

// Shared shell for the full-list "View all" pages (albums / artists / playlists /
// songs). Keeps the same sidebar + backdrop as the home page.
export default function BrowseShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen font-sans overflow-hidden relative gap-2"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <DynamicBackground />
      <Sidebar />

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-5 md:px-8 pt-6 pb-2 flex-shrink-0">
          <Link
            href="/"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 flex-shrink-0"
            style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            title="Back to home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-5 md:px-8 pt-2 pb-44">
          {children}
        </div>
      </div>
    </div>
  );
}
