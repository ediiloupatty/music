import Link from "next/link";
import Image from "next/image";
import MainTracksContainer from "@/components/MainTracksContainer";
import { getTracksByCategory, getUserFavorites, Track } from "@/lib/cloudflare";
import { auth, signOut } from "@/auth";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { id: "Deep Coding",      label: "Deep Coding",      desc: "Electronic, ambient.",  bgGradient: "from-blue-600 to-violet-800",   image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" },
  { id: "Creative Design",  label: "Creative Design",  desc: "Upbeat & inspiring.",   bgGradient: "from-amber-400 to-orange-500",  image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop" },
  { id: "Routine Tasks",    label: "Routine Tasks",    desc: "Energetic focus.",       bgGradient: "from-teal-300 to-emerald-500",  image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop" },
  { id: "Relax & Unwind",  label: "Relax & Unwind",   desc: "Calm melodies.",         bgGradient: "from-indigo-600 to-purple-700", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop" },
];

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
    <div className="flex h-screen text-slate-100 font-sans bg-[#0d0d12] overflow-hidden relative gap-2">

      {/* Background glows */}
      <div className="pointer-events-none absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-rose-900/25 via-purple-900/10 to-transparent rounded-full blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-900/20 to-transparent rounded-full blur-[100px]" />

      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="relative z-20 flex flex-col items-center w-[72px] md:w-[88px] py-7 flex-shrink-0 h-full border-r border-white/5 mr-4 md:mr-8">

        {/* Avatar / logo */}
        <div className="mb-10 w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-purple-600 border-2 border-white/10 shadow-[0_0_14px_rgba(239,68,68,0.35)] flex items-center justify-center flex-shrink-0 cursor-pointer relative">
          {isLoggedIn ? (
            <span className="font-bold text-white text-sm">{session.user?.name?.charAt(0) || "U"}</span>
          ) : (
            <Image src="/logo.png" alt="Logo" width={44} height={44} className="object-cover opacity-80" />
          )}
          {isLoggedIn && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0d0d12]" />
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
        <header className="flex items-center justify-between px-6 md:px-8 pt-7 pb-5 flex-shrink-0">
          {/* Back / Forward + Search */}
          <div className="flex items-center gap-3">
            <button className="text-slate-500 hover:text-white text-lg leading-none transition-colors">‹</button>
            <button className="text-slate-600 hover:text-white text-lg leading-none transition-colors">›</button>
            <div className="ml-3 flex items-center gap-2 bg-white/5 border border-white/[0.08] rounded-full px-4 py-2.5 w-56 md:w-80 lg:w-[420px] focus-within:bg-white/8 focus-within:border-white/15 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400 flex-shrink-0">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search for categories, songs..."
                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
              />
            </div>
          </div>

          {/* Notification bell */}
          <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 relative transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0d0d12]" />
          </button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-36">
          <div className="flex flex-col lg:flex-row gap-8 w-full">

            {/* ── LEFT COLUMN ── */}
            <div className="flex-1 min-w-0">

              {/* Playlists */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white tracking-wide">Playlists</h2>
                <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">More ›</a>
              </div>

              <div className="flex gap-5 overflow-x-auto pb-3 snap-x hide-scrollbar -mx-1 px-1">
                {CATEGORIES.map((cat) => {
                  const isActive = currentCategory === cat.id;
                  return (
                    <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.id)}`}
                      className="snap-start flex-shrink-0">
                      <div className="flex flex-col w-[190px] group cursor-pointer">
                        {/* Card image area */}
                        <div className={`w-[190px] h-[190px] rounded-2xl mb-3 shadow-lg overflow-hidden relative bg-gradient-to-br ${cat.bgGradient} transition-transform duration-300 group-hover:-translate-y-2 ${isActive ? 'ring-2 ring-white/60 shadow-[0_0_20px_rgba(255,255,255,0.15)]' : ''}`}>
                          {/* overlay tint */}
                          <div className="absolute inset-0 bg-black/10 z-[1]" />
                          {/* background texture */}
                          <img src={cat.image} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 z-0" />
                          {/* Rating pill — always on top inside the card */}
                          <div className="absolute bottom-3 right-3 z-[2] bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
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
              <div className="rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_8px_24px_rgba(168,85,247,0.3)] min-h-[170px]">
                <h3 className="text-xl font-bold text-white leading-snug">
                  Upgrade<br/>your account
                </h3>
                <div className="absolute -bottom-4 -right-2 text-7xl opacity-80 select-none">📻</div>
                <button className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors text-sm">
                  →
                </button>
              </div>

              {/* Fav Artists */}
              <div>
                <h2 className="text-base font-bold text-white tracking-wide mb-4">Fav Artists</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { name: "Sia",        sub: "34 songs in library", rating: "5★", img: "https://images.unsplash.com/photo-1516280440502-861118742b78?q=80&w=150" },
                    { name: "The Weeknd", sub: "29 songs in library", rating: "4★", img: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=150" },
                    { name: "Lana Del Rey", sub: "12 songs in library", rating: "4★", img: "https://images.unsplash.com/photo-1493225457284-0bf53ce86e62?q=80&w=150" },
                  ].map((artist) => (
                    <div key={artist.name} className="flex items-center gap-3 group cursor-pointer">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <img src={artist.img} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute top-0 right-0 bg-pink-500 text-[8px] font-bold px-1 rounded-full border border-[#0d0d12]">{artist.rating}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-white leading-tight">{artist.name}</h4>
                        <p className="text-xs text-slate-400">{artist.sub}</p>
                      </div>
                      <button className="text-slate-600 hover:text-slate-300 transition-colors text-sm font-bold">•••</button>
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
