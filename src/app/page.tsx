import Link from "next/link";
import MainTracksContainer from "@/components/MainTracksContainer";
import { getTracksByCategory, getUserFavorites, Track } from "@/lib/cloudflare";
import { auth, signOut } from "@/auth";
import { CATEGORIES } from "@/lib/constants";
import DynamicBackground from "@/components/DynamicBackground";
import ThemeToggleButton from "@/components/ThemeToggleButton";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams = await searchParams;
  const currentCategory = (resolvedParams?.category as string) || null;

  // Fetch all tracks OR filtered by category
  const tracks: Track[] = await getTracksByCategory(currentCategory);
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const userFavorites = isLoggedIn && session.user?.email
    ? await getUserFavorites(session.user.email)
    : [];

  return (
    <div
      className="flex h-screen font-sans overflow-hidden relative gap-2"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <DynamicBackground />

      {/* ─── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex relative z-20 flex-col items-center w-[88px] py-7 flex-shrink-0 h-full mr-8"
        style={{ borderRight: "1px solid var(--border-subtle)" }}
      >
        {/* App logo / Avatar */}
        <div
          className="mb-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer relative transition-all hover:scale-110"
          style={{
            background: isLoggedIn
              ? "linear-gradient(135deg, var(--accent), #6366f1)"
              : "linear-gradient(135deg, var(--accent), #6366f1)",
            boxShadow: "0 0 14px var(--accent-glow)",
          }}
        >
          {isLoggedIn ? (
            <span className="font-bold text-white text-sm">{session.user?.name?.charAt(0) || "U"}</span>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
          {isLoggedIn && (
            <span
              className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: "var(--accent)", borderColor: "var(--bg-primary)" }}
            />
          )}
        </div>

        {/* Nav icons with tooltips */}
        <nav className="flex flex-col gap-8 items-center w-full flex-1">
          {/* Home */}
          <Link href="/" className="relative flex items-center justify-center w-full group py-1" title="Home">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
              style={{ color: "var(--accent)" }}>
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full"
              style={{ background: "var(--accent)" }}
            />
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}>
              Home
            </span>
          </Link>

          {/* Favorites */}
          <Link href="/favorites" className="flex items-center justify-center w-full group py-1 relative" title="Favorites">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}>
              Favorites
            </span>
          </Link>

          {/* Admin */}
          <Link href="/admin" className="flex items-center justify-center w-full group py-1 relative" title="Admin">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
            <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}>
              Admin
            </span>
          </Link>

          {/* Sign out / Sign in — push to bottom */}
          <div className="mt-auto flex flex-col gap-4 items-center">
            {/* Settings */}
            <Link href="/settings" className="flex items-center justify-center w-full group py-1 relative" title="Settings">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                style={{ color: "var(--text-muted)" }}
                className="group-hover:text-white transition-colors">
                <path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 8.5 12 8.5s3.5 1.57 3.5 3.5S13.93 15.5 12 15.5zm7.43-2.06c.04-.31.07-.63.07-.94s-.03-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96a7.44 7.44 0 0 0-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.3-.07.63-.07.94s.03.64.07.94L2.86 14.52c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58z" />
              </svg>
              <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}>
                Settings
              </span>
            </Link>

            {isLoggedIn ? (
              <form action={async () => {
                "use server";
                await signOut();
              }}>
                <button type="submit" title="Sign Out"
                  className="flex items-center justify-center w-full group py-1 relative">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                    style={{ color: "var(--text-muted)" }}
                    className="group-hover:text-red-400 transition-colors">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                  </svg>
                  <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}>
                    Sign Out
                  </span>
                </button>
              </form>
            ) : (
              <Link href="/login" title="Sign In"
                className="flex items-center justify-center w-full group py-1 relative">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                  style={{ color: "var(--text-muted)" }}
                  className="group-hover:text-white transition-colors">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-card)" }}>
                  Sign In
                </span>
              </Link>
            )}
          </div>
        </nav>
      </aside>

      {/* ─── MAIN AREA ────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <header className="flex items-center justify-between px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 flex-shrink-0 gap-3">
          
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-center flex-shrink-0">
            {isLoggedIn ? (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center relative shadow-md"
                style={{ background: "linear-gradient(135deg, var(--accent), #6366f1)" }}
              >
                <span className="font-bold text-white text-xs">{session.user?.name?.charAt(0) || "U"}</span>
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full border"
                  style={{ background: "var(--accent)", borderColor: "var(--bg-primary)" }} />
              </div>
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md"
                style={{ background: "linear-gradient(135deg, var(--accent), #6366f1)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          {/* Desktop back/forward */}
          <div className="hidden md:flex items-center gap-3">
            <button className="transition-colors text-lg leading-none" style={{ color: "var(--text-muted)" }}>‹</button>
            <button className="transition-colors text-lg leading-none" style={{ color: "var(--text-muted)" }}>›</button>
          </div>

          {/* Search */}
          <div
            className="flex-1 max-w-[420px] flex items-center gap-2 rounded-full px-4 py-2.5 transition-all"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(12px)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search songs, artists..."
              className="bg-transparent border-none outline-none text-sm w-full"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* Theme toggle + notification */}
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center relative transition-all"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full border animate-pulse"
                style={{ background: "var(--accent)", borderColor: "var(--bg-primary)" }}
              />
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-48">
          <div className="flex flex-col lg:flex-row gap-8 w-full">

            {/* ── LEFT COLUMN ── */}
            <div className="flex-1 min-w-0">

              {/* Playlists / Categories */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Playlists</h2>
                <a href="#" className="text-sm transition-colors" style={{ color: "var(--text-muted)" }}>More ›</a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 pb-6 pt-1">
                {CATEGORIES.map((cat) => {
                  const isActive = currentCategory === cat.id;
                  return (
                    <Link key={cat.id} href={isActive ? "/" : `/?category=${encodeURIComponent(cat.id)}`}
                      className="block group">
                      <div className="flex flex-col w-full cursor-pointer text-center md:text-left">
                        <div
                          className={`w-full aspect-square rounded-2xl mb-3 shadow-lg overflow-hidden relative bg-gradient-to-br ${cat.bgGradient} transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-105 group-hover:shadow-2xl ${isActive ? 'outline outline-2 outline-offset-2' : ''}`}
                          style={isActive ? { outlineColor: "var(--accent)" } : {}}
                        >
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500 z-[1]" />
                          <img src={cat.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 z-0" />
                          
                          {isActive && (
                            <div className="absolute inset-0 z-[2] flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          )}

                          {/* Play button on hover */}
                          {!isActive && (
                            <div className="absolute bottom-3 right-3 z-[3] translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                                style={{ background: "var(--accent)" }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          )}

                          {/* Rating pill */}
                          {!isActive && (
                            <div className="absolute bottom-3 right-3 z-[2] bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-300">
                              4.5 <span className="text-yellow-300 text-xs">★</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{cat.label}</h3>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{cat.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Category filter chips (horizontal scroll) */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
                <Link href="/"
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: !currentCategory ? "var(--accent)" : "var(--bg-card)",
                    color: !currentCategory ? "white" : "var(--text-secondary)",
                    border: "1px solid",
                    borderColor: !currentCategory ? "var(--accent)" : "var(--border-card)",
                  }}>
                  All
                </Link>
                {CATEGORIES.map((cat) => (
                  <Link key={cat.id}
                    href={currentCategory === cat.id ? "/" : `/?category=${encodeURIComponent(cat.id)}`}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    style={{
                      background: currentCategory === cat.id ? "var(--accent)" : "var(--bg-card)",
                      color: currentCategory === cat.id ? "white" : "var(--text-secondary)",
                      border: "1px solid",
                      borderColor: currentCategory === cat.id ? "var(--accent)" : "var(--border-card)",
                    }}>
                    {cat.label}
                  </Link>
                ))}
              </div>

              {/* Tracks */}
              <div>
                <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
                  {currentCategory ? `${currentCategory}` : "All Tracks"}
                </h2>
                <MainTracksContainer
                  initialTracks={tracks}
                  currentCategory={currentCategory}
                  userFavorites={userFavorites}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="w-full lg:w-[280px] xl:w-[300px] flex flex-col gap-6 flex-shrink-0">

              {/* Upgrade banner */}
              <div
                className="rounded-2xl p-6 relative overflow-hidden min-h-[170px] group cursor-pointer transition-all duration-500"
                style={{
                  background: "linear-gradient(135deg, var(--accent-dark), var(--bg-secondary))",
                  border: "1px solid var(--border-card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] skew-x-12 z-10" />
                <h3 className="text-xl font-extrabold text-white leading-snug drop-shadow-md z-20 relative">
                  Upgrade<br/>your account
                </h3>
                <div className="absolute -bottom-4 -right-2 text-7xl opacity-80 select-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 z-0">📻</div>
                <button className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-all text-sm shadow-lg group-hover:scale-110 z-20">→</button>
              </div>

              {/* Focus Stats */}
              <div>
                <h2 className="text-base font-black mb-4" style={{ color: "var(--text-primary)" }}>Your Focus Stats</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { title: "Deep Work", value: "12.5 hrs", desc: "this week", iconPath: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v5.25l4.5 2.67.75-1.23-3.75-2.22V8z", color: "#3b82f6" },
                    { title: "Pomodoro Sessions", value: "24 cycles", desc: "completed", iconPath: "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z", color: "var(--accent)" },
                    { title: "Focus Streak", value: "5 days", desc: "in a row", iconPath: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z", color: "#f97316" },
                  ].map((stat) => (
                    <div
                      key={stat.title}
                      className="stat-card-hover flex items-center gap-3 group cursor-pointer p-3 -mx-3 rounded-2xl"
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform"
                        style={{ background: stat.color + "22" }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill={stat.color}>
                          <path d={stat.iconPath} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>{stat.title}</h4>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-sm font-extrabold" style={{ color: "var(--text-secondary)" }}>{stat.value}</span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.desc}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
