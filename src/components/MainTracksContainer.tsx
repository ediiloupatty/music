"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import FavoriteButton from "./FavoriteButton";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";
import { moveTrackToPlaylistAction } from "@/app/actions/tracks";
import { useIncrementalList } from "./useIncrementalList";
import CoverImage from "@/components/CoverImage";
import TrackDuration from "@/components/TrackDuration";

// Generate a consistent index from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Beautiful gradient palettes for track covers
const COVER_PALETTES = [
  { from: "#6366f1", to: "#8b5cf6" }, // indigo → violet
  { from: "#14b8a6", to: "#06b6d4" }, // teal → cyan
  { from: "#f43f5e", to: "#ec4899" }, // rose → pink
  { from: "#f59e0b", to: "#f97316" }, // amber → orange
  { from: "#10b981", to: "#059669" }, // emerald
  { from: "#3b82f6", to: "#6366f1" }, // blue → indigo
  { from: "#a855f7", to: "#ec4899" }, // purple → pink
  { from: "#06b6d4", to: "#3b82f6" }, // cyan → blue
  { from: "#84cc16", to: "#10b981" }, // lime → emerald
  { from: "#f97316", to: "#ef4444" }, // orange → red
];

// SVG icon paths for different music icons
const MUSIC_ICONS = [
  "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  "M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z",
  "M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z",
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
];

function TrackCoverArt({ title, category, coverUrl }: { title: string; category: string; coverUrl?: string }) {
  if (coverUrl) {
    return <CoverImage src={coverUrl} alt={title} />;
  }

  const palIdx = hashString(title + category) % COVER_PALETTES.length;
  const iconIdx = hashString(title) % MUSIC_ICONS.length;
  const palette = COVER_PALETTES[palIdx];
  const iconPath = MUSIC_ICONS[iconIdx];

  return (
    <div
      className="w-full h-full relative flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
      }}
    >
      <div
        className="absolute w-10 h-10 rounded-full opacity-30"
        style={{ background: "white", filter: "blur(10px)" }}
      />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white" className="relative z-10 drop-shadow opacity-90">
        <path d={iconPath} />
      </svg>
    </div>
  );
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className={`flex items-end gap-[2px] h-3.5 ${playing ? "" : "eq-paused"}`}>
      <span className="eq-bar" />
      <span className="eq-bar" />
      <span className="eq-bar" />
      <span className="eq-bar" />
    </span>
  );
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MainTracksContainer({
  initialTracks,
  currentCategory,
  userFavorites,
  isLoggedIn,
  columns = false,
}: {
  initialTracks: Track[];
  currentCategory: string | null;
  userFavorites: string[];
  isLoggedIn: boolean;
  columns?: boolean;
}) {
  const url = currentCategory ? `/api/tracks?category=${encodeURIComponent(currentCategory)}` : null;
  const { playTrack, tracks: playerTracks, currentTrackIndex, isPlaying } = usePlayer();

  const { data, mutate } = useSWR(url, fetcher, {
    fallbackData: { tracks: initialTracks },
    revalidateOnFocus: false,
  });

  // Playlists for the "Move to playlist" menu
  const { data: playlistData } = useSWR(isLoggedIn ? "/api/playlists" : null, fetcher, {
    revalidateOnFocus: false,
  });
  const playlists: { id: string; name: string }[] = playlistData?.playlists || [];

  // When browsing a category, SWR fetches fresh data from the API; otherwise
  // (search results or homepage) we use the tracks passed in directly.
  const displayTracks: Track[] = url ? (data?.tracks || initialTracks) : initialTracks;

  // Render ~40 rows first; reveal more as the user scrolls (keeps the DOM light
  // for large libraries). The full array is still handed to the player below.
  const { visibleCount, sentinelRef, hasMore } = useIncrementalList(displayTracks.length);

  const currentPlayingId = playerTracks[currentTrackIndex]?.id;

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function handleMove(track: Track, playlistName: string) {
    setMenuOpenId(null);
    setMovingId(track.id);
    const res = await moveTrackToPlaylistAction(track.id, playlistName);
    setMovingId(null);
    if (res.success) {
      setToast(`Moved to "${playlistName}"`);
      setTimeout(() => setToast(null), 2500);
      // If we're viewing a specific category and the track left it, drop it locally
      if (currentCategory && currentCategory !== playlistName) {
        mutate({ tracks: displayTracks.filter((t) => t.id !== track.id) }, false);
      } else {
        mutate();
      }
    } else {
      setToast(res.error || "Failed to move");
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <>
      {/* Click-away backdrop for the menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-2xl"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
        >
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {displayTracks.length === 0 ? (
          <p className="text-slate-400">No tracks found. Upload some via the Admin panel.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Column header (desktop) — only in table/columns mode */}
            {columns && (
              <div
                className="hidden md:flex items-center gap-4 px-3 pb-2 mb-1 border-b text-[10px] font-bold tracking-wider uppercase"
                style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}
              >
                <span className="w-5 text-center flex-shrink-0">#</span>
                <span className="w-11 flex-shrink-0" />
                <span className="flex-1 min-w-0">Title</span>
                <span className="w-36 lg:w-44 flex-shrink-0">Artist</span>
                <span className="w-12 text-right flex-shrink-0">Time</span>
                <span className="flex-shrink-0" style={{ width: isLoggedIn ? "4rem" : "1.75rem" }} />
              </div>
            )}
            {displayTracks.slice(0, visibleCount).map((track, idx) => {
              const isFavorited = userFavorites.includes(track.id);
              const isCurrent = !!currentPlayingId && track.id === currentPlayingId;

              return (
                <div
                  key={track.id}
                  className="track-row flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer group"
                  onClick={() => playTrack(displayTracks, idx)}
                  style={
                    isCurrent
                      ? { background: "var(--accent-glow)", borderColor: "var(--border-card)" }
                      : undefined
                  }
                >
                  {/* Index / Equalizer / Play */}
                  <span className="w-5 flex items-center justify-center flex-shrink-0">
                    {isCurrent ? (
                      <Equalizer playing={isPlaying} />
                    ) : (
                      <>
                        <span
                          className="text-right text-xs font-mono group-hover:hidden w-full"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {idx + 1}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="hidden group-hover:block"
                          style={{ color: "var(--accent)" }}
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </>
                    )}
                  </span>

                  {/* Cover */}
                  <div className="relative w-11 h-11 rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                    <TrackCoverArt title={track.title} category={track.category} coverUrl={track.cover_url} />
                  </div>

                  {/* Title column */}
                  <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span
                      className="font-semibold text-sm truncate transition-colors"
                      style={{ color: isCurrent ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      {cleanTitle(track.title)}
                    </span>
                    {/* Stacked artist: always in list mode; mobile-only in columns mode */}
                    <span className={columns ? "md:hidden" : "block"}>
                      {track.artist ? (
                        <Link
                          href={`/artist/${encodeURIComponent(track.artist)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs truncate hover:underline w-fit max-w-full transition-colors"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {track.artist}
                        </Link>
                      ) : (
                        <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {track.category}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Artist / Album / Time columns — table mode only */}
                  {columns && (
                    <>
                      <div className="hidden md:block w-36 lg:w-44 flex-shrink-0 min-w-0">
                        {track.artist ? (
                          <Link
                            href={`/artist/${encodeURIComponent(track.artist)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs truncate block hover:underline transition-colors"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {track.artist}
                          </Link>
                        ) : (
                          <span className="text-xs truncate block" style={{ color: "var(--text-muted)" }}>
                            {track.category}
                          </span>
                        )}
                      </div>
                      <TrackDuration
                        track={track}
                        className="hidden sm:block w-12 text-right text-xs font-mono tabular-nums flex-shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      />
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!columns && (
                      <TrackDuration track={track} className="text-xs font-mono tabular-nums hidden sm:block" style={{ color: "var(--text-muted)" }} />
                    )}

                    {/* ⋯ menu — hidden until the row is hovered */}
                    {isLoggedIn && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === track.id ? null : track.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-[var(--bg-card-hover)] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                          style={{ color: "var(--text-muted)" }}
                          title="More options"
                          disabled={movingId === track.id}
                        >
                          {movingId === track.id ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="animate-spin">
                              <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          )}
                        </button>

                        {menuOpenId === track.id && (
                          <div
                            className="absolute right-0 top-9 z-50 w-52 rounded-xl py-2 shadow-2xl"
                            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)" }}
                          >
                            <p
                              className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Move to playlist
                            </p>
                            {playlists.length === 0 ? (
                              <p className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                No playlists yet.
                              </p>
                            ) : (
                              <div className="max-h-60 overflow-y-auto scrollbar-thin">
                                {playlists.map((pl) => {
                                  const isHere = track.category === pl.name;
                                  return (
                                    <button
                                      key={pl.id}
                                      onClick={() => !isHere && handleMove(track, pl.name)}
                                      disabled={isHere}
                                      className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      <span className="truncate">{pl.name}</span>
                                      {isHere && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent)" }}>
                                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                        </svg>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Favorite (heart) — far right */}
                    <FavoriteButton trackId={track.id} initialIsFavorited={isFavorited} isLoggedIn={isLoggedIn} />
                  </div>
                </div>
              );
            })}
            {/* Scroll sentinel: reveals the next batch of rows as it nears view. */}
            {hasMore && <div ref={sentinelRef} className="h-1 w-full" aria-hidden />}
          </div>
        )}
      </div>
    </>
  );
}
