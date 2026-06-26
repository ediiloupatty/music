import Link from "next/link";
import { auth, signOut } from "@/auth";
import PlaylistSection from "@/components/PlaylistSection";
import SidebarProfile from "@/components/SidebarProfile";

export default async function Sidebar({ currentCategory }: { currentCategory?: string | null }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <aside
      className="hidden md:flex relative z-20 flex-col w-[220px] py-7 flex-shrink-0 h-full"
      style={{ borderRight: "1px solid var(--border-subtle)" }}
    >
      {/* App logo / Avatar */}
      <SidebarProfile 
        isLoggedIn={isLoggedIn}
        name={session?.user?.name}
        email={session?.user?.email}
      />

      {/* Nav icons */}
      <nav className="flex flex-col gap-1 px-2 mb-6">
        {/* Home */}
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5" title="Home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Home</span>
        </Link>

        {/* Favorites */}
        <Link href="/favorites" className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5" title="Favorites">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
            className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Favorites</span>
        </Link>

        {/* Settings */}
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5" title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
            className="text-[var(--text-muted)] group-hover:text-white transition-colors flex-shrink-0">
            <path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 8.5 12 8.5s3.5 1.57 3.5 3.5S13.93 15.5 12 15.5zm7.43-2.06c.04-.31.07-.63.07-.94s-.03-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96a7.44 7.44 0 0 0-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.3-.07.63-.07.94s.03.64.07.94L2.86 14.52c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-white transition-colors">Settings</span>
        </Link>

        {/* Admin */}
        <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5" title="Admin">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
            className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Admin</span>
        </Link>

        {/* Sign Out / Sign In */}
        {isLoggedIn ? (
          <form action={async () => {
            "use server";
            await signOut();
          }}>
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
                className="text-[var(--text-muted)] group-hover:text-red-400 transition-colors flex-shrink-0">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-red-400 transition-colors">Sign Out</span>
            </button>
          </form>
        ) : (
          <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
              className="text-[var(--text-muted)] group-hover:text-white transition-colors flex-shrink-0">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-white transition-colors">Sign In</span>
          </Link>
        )}
      </nav>

      {/* Divider */}
      <div className="mx-4 mb-4" style={{ height: "1px", background: "var(--border-subtle)" }} />

      {/* ─── YOUR LIBRARY / PLAYLISTS ─── */}
      <div className="flex flex-col flex-1 min-h-0 gap-1 py-1">
        <PlaylistSection
          currentCategory={currentCategory || null}
          isLoggedIn={isLoggedIn}
          sidebarMode
        />
      </div>
    </aside>
  );
}
