"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Track, Artist, Playlist } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";
import AISearchBar from "@/components/AISearchBar";
import MainTracksContainer from "@/components/MainTracksContainer";
import AlbumSection from "@/components/AlbumSection";
import ArtistGrid from "@/components/ArtistGrid";
import PlaylistGrid from "@/components/PlaylistGrid";
import HeartButton from "@/components/HeartButton";
import DailyMixSection from "@/components/DailyMixSection";
import { hashString, formatDuration, PALETTES } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";

type HomeContentProps = {
  tracks: Track[];
  currentCategory: string | null;
  currentAlbum?: string | null;
  recentlyPlayed: Track[];
  newTracks: Track[];
  artists: Artist[];
  playlists: Playlist[];
  userFavorites: string[];
  isLoggedIn: boolean;
};

// ─── Cover art fallback (shared gradient logic) ──────────────────────────────
function Cover({ track, className = "" }: { track: Track; className?: string }) {
  if (track.cover_url) {
    return <CoverImage src={track.cover_url} alt={track.title} className={className} />;
  }
  const [c1, c2] = PALETTES[hashString(track.title + track.category) % PALETTES.length];
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`} style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <svg width="38%" height="38%" viewBox="0 0 24 24" fill="white" className="opacity-90 drop-shadow">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    </div>
  );
}

// ─── Section heading with "View all" ─────────────────────────────────────────
function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: "var(--accent)" }}>
          View all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Link>
      )}
    </div>
  );
}

type CuratedHeroAndSongsProps = {
  tracks: Track[];
  recentlyPlayed: Track[];
  newTracks: Track[];
  userFavorites: string[];
  isLoggedIn: boolean;
};

function CuratedHeroAndSongs({
  tracks,
  recentlyPlayed,
  newTracks,
  userFavorites,
  isLoggedIn,
}: CuratedHeroAndSongsProps) {
  const { playTrack, tracks: playerTracks, currentTrackIndex, isPlaying, setIsPlaying } = usePlayer();

  // The hero spotlights whatever is currently loaded in the player; before the
  // user plays anything, it falls back to the first recently-played track.
  const playerCurrent = playerTracks[currentTrackIndex];
  const featured = playerCurrent || recentlyPlayed[0] || tracks[0] || null;

  // Recently played, minus whatever's already spotlighted in the hero, with a
  // fallback to the library so the column never renders empty.
  const recentBase = recentlyPlayed.length ? recentlyPlayed : tracks;
  const recentList = recentBase.filter((t) => t.id !== featured?.id).slice(0, 5);

  // "Recently Added" when we actually have fresh tracks; otherwise a generic
  // slice of the library (kept titled "Songs" so the heading stays honest).
  const hasNew = newTracks.length > 0;
  const songs = (hasNew ? newTracks : tracks).slice(0, 7);
  const songsHeading = hasNew ? "Recently Added" : "Songs";

  const isFeaturedPlaying =
    !!featured && !!playerCurrent && playerCurrent.id === featured.id && isPlaying;

  const playFeatured = () => {
    if (!featured) return;
    // Toggle if the featured track is already the active one.
    if (playerCurrent && playerCurrent.id === featured.id) {
      setIsPlaying(!isPlaying);
      return;
    }
    const queue = recentlyPlayed.length ? recentlyPlayed : tracks;
    const idx = Math.max(0, queue.findIndex((t) => t.id === featured.id));
    playTrack(queue, idx);
  };

  return (
    <>
      {/* ─── HERO: now playing + cover + quick play ─────────────── */}
      {featured && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-8 xl:gap-6 items-center pt-10 xl:pt-14 mb-12">
            {/* Now playing info */}
            <div className="min-w-0 text-center xl:text-left order-2 xl:order-1">
              <p className="text-[11px] font-black tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>
                Now Playing
              </p>
              <h1 className="text-4xl lg:text-5xl font-black leading-none tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                {cleanTitle(featured.title)}
              </h1>
              {featured.artist ? (
                <Link
                  href={`/artist/${encodeURIComponent(featured.artist)}`}
                  className="text-xl font-bold hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  {featured.artist}
                </Link>
              ) : (
                <span className="text-xl font-bold" style={{ color: "var(--accent)" }}>{featured.category}</span>
              )}
              {(featured.album || featured.year) && (
                <p className="text-sm mt-4 max-w-sm mx-auto md:mx-0" style={{ color: "var(--text-secondary)" }}>
                  {featured.album}
                  {featured.album && featured.year ? " · " : ""}
                  {featured.year || ""}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 justify-center md:justify-start mt-6">
                <button
                  onClick={playFeatured}
                  className="flex items-center gap-2 pl-5 pr-6 py-3 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "var(--accent)", boxShadow: "0 8px 24px var(--accent-glow)" }}
                >
                  {isFeaturedPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  )}
                  {isFeaturedPlaying ? "Pause" : "Play"}
                </button>
                <HeartButton
                  key={featured.id}
                  trackId={featured.id}
                  initialIsFavorited={userFavorites.includes(featured.id)}
                  isLoggedIn={isLoggedIn}
                  size={18}
                  stopPropagation={false}
                  className="w-11 h-11 rounded-full border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)]"
                />
              </div>
            </div>

            {/* Cover + vinyl */}
            <div className="relative w-[240px] sm:w-[280px] lg:w-[320px] flex-shrink-0 mx-auto order-1 xl:order-2 xl:mr-24">
              {/* Ambient lighting behind the cover + vinyl — spreads wide to the
                  sides and downward, but stays shallow up top so it never bleeds
                  into the header / clips flat. */}
              <div
                className="absolute -inset-x-40 -top-2 -bottom-20 rounded-[50%] blur-[80px] -z-10 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 70% 48% at 50% 58%, rgba(45,212,191,0.38), transparent 72%)" }}
              />
              <div
                className="absolute -inset-x-20 -top-1 -bottom-12 rounded-[50%] blur-[55px] -z-10 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 58% 50% at 55% 58%, rgba(45,212,191,0.55), transparent 60%)" }}
              />
              {/* Vinyl disc tucked behind the cover, peeking out on the right */}
              <div className="absolute inset-0 translate-x-[16%] z-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`relative w-full h-full rounded-full ${isFeaturedPlaying ? "spin-slow" : ""}`}
                  style={{
                    background: "repeating-radial-gradient(circle at 50% 50%, #1c1c1f 0px, #1c1c1f 2px, #0a0a0c 2px, #0a0a0c 6px)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="absolute inset-0 m-auto w-[22%] h-[22%] rounded-full" style={{ background: "var(--accent)", opacity: 0.9 }} />
                  <div className="absolute inset-0 m-auto w-[6%] h-[6%] rounded-full bg-black" />
                </div>
              </div>
              {/* Cover */}
              <div className="relative z-10 w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <Cover track={featured} />
              </div>
            </div>

          {/* Quick Access: Liked Songs shortcut + recently played */}
          <div className="w-full order-3 xl:max-w-[460px] xl:justify-self-end">
            <SectionHeading title="Recently Played" href="/songs" />
            {/* Liked Songs quick-access tile */}
            <Link
              href="/favorites"
              className="flex items-center gap-3 p-2 mb-2 rounded-xl transition-colors hover:bg-[var(--bg-card-hover)]"
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent), #6366f1)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  Liked Songs
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {userFavorites.length} {userFavorites.length === 1 ? "song" : "songs"}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </Link>
            <div className="flex flex-col gap-1">
              {recentList.map((t, i) => {
                const isCurrent = playerCurrent?.id === t.id;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => playTrack(recentList, i)}
                    onKeyDown={(e) => e.key === "Enter" && playTrack(recentList, i)}
                    className="group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors hover:bg-[var(--bg-card-hover)]"
                    style={isCurrent ? { background: "var(--accent-glow)" } : undefined}
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                      <Cover track={t} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate" style={{ color: isCurrent ? "var(--accent)" : "var(--text-primary)" }}>
                        {cleanTitle(t.title)}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{t.artist || t.category}</p>
                    </div>
                    <span className="text-xs font-mono tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      {formatDuration(t.duration)}
                    </span>
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ border: "1px solid var(--border-card)", color: "var(--accent)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SONGS TABLE ─────────────────────────────────────────── */}
      {songs.length > 0 && (
        <section className="mb-12">
          <SectionHeading title={songsHeading} href="/songs" />
          {/* Column header */}
          <div
            className="hidden md:flex items-center gap-4 px-3 pb-2 mb-1 border-b text-[10px] font-bold tracking-wider uppercase"
            style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}
          >
            <span className="w-5 text-center flex-shrink-0">#</span>
            <span className="w-11 flex-shrink-0" />
            <span className="flex-1 min-w-0">Title</span>
            <span className="w-40 lg:w-48 flex-shrink-0">Artist</span>
            <span className="w-40 lg:w-48 flex-shrink-0">Album</span>
            <span className="w-12 text-right flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </span>
            <span className="w-16 flex-shrink-0" />
          </div>

          <div className="flex flex-col">
            {songs.map((t, i) => {
              const isCurrent = playerCurrent?.id === t.id;
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => playTrack(songs, i)}
                  onKeyDown={(e) => e.key === "Enter" && playTrack(songs, i)}
                  className="track-row flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer group"
                  style={isCurrent ? { background: "var(--accent-glow)" } : undefined}
                >
                  {/* Index / play */}
                  <span className="w-5 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono group-hover:hidden" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="hidden group-hover:block" style={{ color: "var(--accent)" }}><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  {/* Cover */}
                  <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0">
                    <Cover track={t} />
                  </div>
                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: isCurrent ? "var(--accent)" : "var(--text-primary)" }}>
                      {cleanTitle(t.title)}
                    </p>
                    <p className="text-xs truncate md:hidden" style={{ color: "var(--text-muted)" }}>{t.artist || t.category}</p>
                  </div>
                  {/* Artist */}
                  <div className="hidden md:block w-40 lg:w-48 flex-shrink-0 min-w-0">
                    {t.artist ? (
                      <Link
                        href={`/artist/${encodeURIComponent(t.artist)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm truncate block hover:underline"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {t.artist}
                      </Link>
                    ) : (
                      <span className="text-sm truncate block" style={{ color: "var(--text-secondary)" }}>{t.category}</span>
                    )}
                  </div>
                  {/* Album */}
                  <span className="hidden md:block w-40 lg:w-48 flex-shrink-0 truncate text-sm" style={{ color: "var(--text-muted)" }}>
                    {t.album || "—"}
                  </span>
                  {/* Duration */}
                  <span className="w-12 text-right text-xs font-mono tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {formatDuration(t.duration)}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-1 w-10 md:w-16 flex-shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
                    <HeartButton
                      trackId={t.id}
                      initialIsFavorited={userFavorites.includes(t.id)}
                      isLoggedIn={isLoggedIn}
                      size={16}
                      className="w-7 h-7 rounded-full hover:bg-[var(--bg-card-hover)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export default function HomeContent({
  tracks,
  currentCategory,
  currentAlbum,
  recentlyPlayed,
  newTracks,
  artists,
  playlists,
  userFavorites,
  isLoggedIn,
}: HomeContentProps) {
  const [filteredTracks, setFilteredTracks] = useState<Track[] | null>(null);
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);

  const handleFilteredTracks = useCallback((result: Track[] | null) => {
    setFilteredTracks(result);
  }, []);

  // Mount the search bar into the top-bar slot in page.tsx (top-center),
  // while keeping the filter state here so results drive the track list.
  // Uses a MutationObserver + retry loop to handle the race between the
  // server-rendered slot and client hydration / navigation timing.
  useEffect(() => {
    const find = () => document.getElementById("search-header-slot");
    const el = find();
    if (el) {
      setSearchSlot(el);
      return;
    }
    // Element not available yet — watch the DOM until it appears.
    let raf: number;
    const observer = new MutationObserver(() => {
      const found = find();
      if (found) {
        setSearchSlot(found);
        observer.disconnect();
        cancelAnimationFrame(raf);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Safety: also poll via rAF in case mutations fire before the observer
    // is connected (extremely unlikely but costs nothing).
    const poll = () => {
      const found = find();
      if (found) {
        setSearchSlot(found);
        observer.disconnect();
        return;
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const isSearch = filteredTracks !== null;
  const isFiltered = isSearch || !!currentCategory || !!currentAlbum;
  const displayTracks = isSearch ? (filteredTracks as Track[]) : tracks;

  const searchBar =
    searchSlot &&
    createPortal(
      <AISearchBar allTracks={tracks} onFilteredTracks={handleFilteredTracks} />,
      searchSlot
    );

  // ── Curated home feed (no category / album / search active) ──
  if (!isFiltered) {
    return (
      <>
        {searchBar}

        <div className="mt-2 pb-4">
          <CuratedHeroAndSongs
            tracks={tracks}
            recentlyPlayed={recentlyPlayed}
            newTracks={newTracks}
            userFavorites={userFavorites}
            isLoggedIn={isLoggedIn}
          />

          {/* ─── DAILY MIX ────────────────────────────────────────── */}
          <DailyMixSection />

          {/* ─── ALBUMS (horizontal) ─────────────────────────────────── */}
          <AlbumSection currentAlbum={null} heading="Albums" limit={7} fillRow viewAllHref="/albums" />

          {/* ─── EXTRA: artists + playlists ──────────────────────────── */}
          <ArtistGrid heading="Popular Artists" artists={artists} limit={7} viewAllHref="/artists" />
          <PlaylistGrid heading="Made For You / Playlist" playlists={playlists} limit={7} viewAllHref="/playlists" />
        </div>
      </>
    );
  }

  // ── Filtered view: search / category / album → track list ──
  return (
    <>
      {searchBar}
      <div className="mt-6">
        <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
          {isSearch
            ? `Search Results (${displayTracks.length})`
            : currentAlbum
              ? `${currentAlbum}`
              : `${currentCategory}`}
        </h2>
        {isSearch && displayTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>
              No matching tracks found
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Try a different description or search term
            </p>
          </div>
        ) : (
          <MainTracksContainer
            key={isSearch ? `search-${displayTracks.length}-${displayTracks[0]?.id || "empty"}` : currentAlbum || currentCategory || "all"}
            initialTracks={displayTracks}
            currentCategory={currentCategory}
            userFavorites={userFavorites}
            isLoggedIn={isLoggedIn}
            columns={!!currentAlbum}
          />
        )}
      </div>
    </>
  );
}
