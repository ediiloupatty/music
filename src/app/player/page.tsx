import Link from "next/link";
import PlaylistSection from "@/components/PlaylistSection";
import HomeContent from "@/components/HomeContent";
import Sidebar from "@/components/Sidebar";
import { getTracksByCategory, getTracksByAlbum, getRecentlyPlayed, getNewTracks, getUserFavorites, getArtists, getPlaylists, getPlaylistById, getTrackById, Track } from "@/lib/cloudflare";
import { auth, signOut } from "@/auth";
import PlaylistDetail from "@/components/PlaylistDetail";
import DynamicBackground from "@/components/DynamicBackground";
import ZenifyGlyph from "@/components/ZenifyGlyph";
import TopHeader from "@/components/TopHeader";
import AutoPlayTrack from "@/components/AutoPlayTrack";
import MainContentWrapper from "@/components/MainContentWrapper";

export default async function PlayerHome({
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
      <div className="relative z-50 flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <TopHeader isHome />

        {/* SCROLLABLE CONTENT */}
        <MainContentWrapper>
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
        </MainContentWrapper>
      </div>
    </div>
  );
}
