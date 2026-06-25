import Link from "next/link";
import Image from "next/image";
import MainTracksContainer from "@/components/MainTracksContainer";
import { getTracksByCategory, getUserFavorites, Track } from "@/lib/cloudflare";
import { auth, signOut } from "@/auth";

export const dynamic = "force-dynamic";

import { CATEGORIES } from "@/lib/constants";
import DynamicBackground from "@/components/DynamicBackground";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams = await searchParams;
  const currentCategory = (resolvedParams?.category as string) || null;

  const tracks: Track[] = await getTracksByCategory(currentCategory);
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const userFavorites = isLoggedIn && session.user?.email
    ? await getUserFavorites(session.user.email)
    : [];

  return (
    <div className="flex h-screen text-slate-100 font-sans bg-[#3B4252] overflow-hidden relative gap-2">

      <DynamicBackground />

      {/* ─── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex relative z-20 flex-col items-center w-[88px] py-7 flex-shrink-0 h-full border-r border-white/5 mr-8">

        {/* Avatar / logo */}
        <div className="mb-10 w-11 h-11 rounded-full bg-slate-800 border-2 border-teal-500/30 shadow-[0_0_14px_rgba(45,212,191,0.2)] flex items-center justify-center flex-shrink-0 cursor-pointer relative hover:border-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all">
          {isLoggedIn ? (
            <span className="font-bold text-white text-sm">{session.user?.name?.charAt(0) || "U"}</span>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400 opacity-80">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          )}
          {isLoggedIn && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-[#3B4252]" />
          )}
        </div>

        {/* Nav icons */}
        <nav className="flex flex-col gap-8 items-center w-full flex-1">
          {/* Home – active */}
          <Link href="/" className="relative flex items-center justify-center w-full group py-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
              className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            {/* active indicator */}
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-l-full shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
          </Link>

          {/* Favorites */}
          <a href="#" className="flex items-center justify-center w-full group py-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
              className="text-slate-500 group-hover:text-slate-300 transition-colors">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </a>

          {/* Admin */}
          <Link href="/admin" className="flex items-center justify-center w-full group py-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
              className="text-slate-500 group-hover:text-slate-300 transition-colors">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </Link>

          {/* Sign out / Sign in – push to bottom */}
          <div className="mt-auto">
            {isLoggedIn ? (
              <form action={async () => {
                "use server";
                await signOut();
              }}>
                <button type="submit" title="Sign Out"
                  className="flex items-center justify-center w-full group py-1">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                    className="text-slate-500 group-hover:text-red-400 transition-colors">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                </button>
              </form>
            ) : (
              <Link href="/login" title="Sign In"
                className="flex items-center justify-center w-full group py-1">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                  className="text-slate-500 group-hover:text-slate-300 transition-colors">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </Link>
            )}
          </div>
        </nav>
      </aside>

      {/* ─── MAIN AREA ────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <header className="flex items-center justify-between px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 flex-shrink-0 gap-3">
          
          {/* Mobile Avatar / Logo */}
          <div className="md:hidden flex items-center justify-center flex-shrink-0">
            {isLoggedIn ? (
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-teal-500/30 flex items-center justify-center relative shadow-md">
                <span className="font-bold text-white text-xs">{session.user?.name?.charAt(0) || "U"}</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-teal-500 rounded-full border border-[#3B4252]" />
              </div>
            ) : (
              <Link href="/login" className="w-9 h-9 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shadow-md hover:border-slate-400 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </Link>
            )}
          </div>

          {/* Desktop Back/Forward */}
          <div className="hidden md:flex items-center gap-3">
            <button className="text-slate-500 hover:text-white text-lg leading-none transition-colors">‹</button>
            <button className="text-slate-600 hover:text-white text-lg leading-none transition-colors">›</button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-[420px] flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/[0.08] rounded-full px-4 py-2.5 focus-within:bg-white/10 focus-within:border-white/20 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400 flex-shrink-0">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
            />
          </div>

          {/* Notification bell */}
          <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 relative transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full border border-[#3B4252] animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
          </button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-36">
          <div className="flex flex-col lg:flex-row gap-8 w-full">

            {/* ── LEFT COLUMN ── */}
            <div className="flex-1 min-w-0">

              {/* Playlists */}
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-white tracking-wide">Playlists</h2>
                <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">More ›</a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 pb-6 pt-4">
                {CATEGORIES.map((cat) => {
                  const isActive = currentCategory === cat.id;
                  return (
                    <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.id)}`}
                      className="block">
                      <div className="flex flex-col w-full group cursor-pointer text-center md:text-left">
                        {/* Card image area */}
                        <div className={`w-full aspect-square rounded-2xl mb-3 shadow-lg overflow-hidden relative bg-gradient-to-br ${cat.bgGradient} transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-105 group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.6)] border border-transparent group-hover:border-teal-500/50 ${isActive ? 'ring-2 ring-teal-500/80 shadow-[0_0_20px_rgba(45,212,191,0.2)]' : ''}`}>
                          {/* overlay tint */}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500 z-[1]" />
                          {/* background texture */}
                          <img src={cat.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 z-0" />
                          
                          {/* Play Button overlay */}
                          <div className="absolute bottom-3 right-3 z-[3] translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                             <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.5)] hover:scale-110 hover:bg-teal-400 transition-all">
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                             </div>
                          </div>

                          {/* Rating pill — always on top inside the card */}
                          <div className="absolute bottom-3 right-3 z-[2] bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-300">
                            4.5 <span className="text-yellow-300 text-xs">★</span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-sm text-white truncate">{cat.label}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Tracks */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-white tracking-wide mb-4">
                  {currentCategory ? `Tracks in ${currentCategory}` : "Recently played"}
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
              <div className="rounded-2xl p-6 relative overflow-hidden bg-gradient-to-br from-teal-900 via-slate-800 to-slate-900 border border-teal-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.3)] min-h-[170px] group cursor-pointer hover:border-teal-500/50 hover:shadow-[0_8px_40px_rgba(45,212,191,0.2)] transition-all duration-500">
                {/* Animated shine effect via translate */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] skew-x-12 z-10" />
                
                <h3 className="text-xl font-extrabold text-white leading-snug drop-shadow-md z-20 relative">
                  Upgrade<br/>your account
                </h3>
                <div className="absolute -bottom-4 -right-2 text-7xl opacity-80 select-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 z-0">📻</div>
                <button className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-all text-sm shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 z-20">
                  →
                </button>
              </div>

              {/* Focus Stats */}
              <div>
                <h2 className="text-base font-bold text-white tracking-wide mb-4">Your Focus Stats</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { 
                      title: "Deep Work", 
                      value: "12.5 hrs", 
                      desc: "this week",
                      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v5.25l4.5 2.67.75-1.23-3.75-2.22V8z"/></svg>,
                      color: "from-blue-500 to-indigo-500" 
                    },
                    { 
                      title: "Pomodoro Sessions", 
                      value: "24 cycles", 
                      desc: "completed",
                      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>,
                      color: "from-teal-400 to-teal-600" 
                    },
                    { 
                      title: "Focus Streak", 
                      value: "5 days", 
                      desc: "in a row",
                      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>,
                      color: "from-orange-400 to-rose-500" 
                    },
                  ].map((stat) => (
                    <div key={stat.title} className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                      <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <div className="text-white drop-shadow-md z-10">
                          {stat.icon}
                        </div>
                        {/* Glow effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300 rounded-xl`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white leading-tight group-hover:text-teal-300 transition-colors">{stat.title}</h4>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-sm font-extrabold text-slate-200">{stat.value}</span>
                          <span className="text-xs text-slate-400">{stat.desc}</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:text-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
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
