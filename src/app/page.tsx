import Link from "next/link";
import PlaylistSection from "@/components/PlaylistSection";
import HomeContent from "@/components/HomeContent";
import Sidebar from "@/components/Sidebar";
import { getTracksByCategory, getTracksByAlbum, getRecentlyPlayed, getNewTracks, getUserFavorites, getArtists, getPlaylists, getPlaylistById, Track } from "@/lib/cloudflare";
import { auth, signOut } from "@/auth";
import PlaylistDetail from "@/components/PlaylistDetail";
import DynamicBackground from "@/components/DynamicBackground";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const resolvedParams = await searchParams;
  const currentCategory = (resolvedParams?.category as string) || null;
  const currentAlbum = (resolvedParams?.album as string) || null;
  const currentPlaylistId = (resolvedParams?.playlist as string) || null;

  const playlist = currentPlaylistId ? await getPlaylistById(currentPlaylistId) : null;
  const playlistTracks = playlist ? await getTracksByCategory(playlist.name) : [];

  // Fetch tracks: by album if browsing an album, else by category (or all)
  const tracks: Track[] = currentAlbum
    ? await getTracksByAlbum(currentAlbum)
    : await getTracksByCategory(currentCategory);

  // Curated feed for the default home view
  const [recentlyPlayed, newTracks, artists, playlists] = await Promise.all([
    getRecentlyPlayed(9),
    getNewTracks(12),
    getArtists(),
    getPlaylists(),
  ]);
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

      <Sidebar currentCategory={currentCategory} />

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
