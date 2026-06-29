import Link from "next/link";
import PlaylistSection from "@/components/PlaylistSection";
import HomeContent from "@/components/HomeContent";
import Sidebar from "@/components/Sidebar";
import { getTracksByCategory, getTracksByAlbum, getRecentlyPlayed, getNewTracks, getUserFavorites, getArtists, getPlaylists, getPlaylistById, getTrackById, Track } from "@/lib/cloudflare";
import { auth, signOut } from "@/auth";
import PlaylistDetail from "@/components/PlaylistDetail";
import DynamicBackground from "@/components/DynamicBackground";
import ZenifyGlyph from "@/components/ZenifyGlyph";
import AutoPlayTrack from "@/components/AutoPlayTrack";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams = await searchParams;
  const currentCategory = (resolvedParams?.category as string) || null;
  const currentAlbum = (resolvedParams?.album as string) || null;
  const currentPlaylistId = (resolvedParams?.playlist as string) || null;
  const playTrackId = (resolvedParams?.play as string) || null;

  // Run ALL independent fetches in parallel to avoid waterfall latency
  const [autoPlayTrack, playlist, tracks, recentlyPlayed, newTracks, artists, playlists, session] =
    await Promise.all([
      playTrackId ? getTrackById(playTrackId) : null,
      currentPlaylistId ? getPlaylistById(currentPlaylistId) : null,
      currentAlbum
        ? getTracksByAlbum(currentAlbum)
        : getTracksByCategory(currentCategory),
      getRecentlyPlayed(9),
      getNewTracks(12),
      getArtists(),
      getPlaylists(),
      auth(),
    ]);

  // These depend on results above, run in parallel where possible
  const [playlistTracks, userFavorites] = await Promise.all([
    playlist ? getTracksByCategory(playlist.name) : Promise.resolve([]),
    session?.user?.email ? getUserFavorites(session.user.email) : Promise.resolve([]),
  ]);
  const isLoggedIn = !!session?.user;

  return (
    <div
      className="flex h-screen font-sans overflow-hidden relative gap-2"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <DynamicBackground />
      {autoPlayTrack && <AutoPlayTrack track={autoPlayTrack} />}

      <Sidebar currentCategory={currentCategory} />

      {/* ─── MAIN AREA ────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <header
          className="flex items-center justify-between px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 flex-shrink-0 gap-3 backdrop-blur-xl transition-all duration-500 z-20"
          style={{
            background: "rgba(43, 51, 63, 0.4)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          
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
                <ZenifyGlyph size={18} />
              </div>
            )}
          </div>

          {/* Search — placeholder, actual AI search is in HomeContent */}
          <div className="flex-1 max-w-[480px]" id="search-header-slot" />

          {/* Theme toggle + notification */}
          <div className="flex items-center gap-2">
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
          <div className="w-full">
            {playlist ? (
              <PlaylistDetail playlist={playlist} tracks={playlistTracks} />
            ) : (
              <HomeContent
                tracks={tracks}
                currentCategory={currentCategory}
                currentAlbum={currentAlbum}
                recentlyPlayed={recentlyPlayed}
                newTracks={newTracks}
                artists={artists}
                playlists={playlists}
                userFavorites={userFavorites}
                isLoggedIn={isLoggedIn}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
