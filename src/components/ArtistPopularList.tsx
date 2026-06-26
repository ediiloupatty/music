"use client";

import { useState } from "react";
import Link from "next/link";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";
import { toggleFavoriteAction } from "@/app/actions/favorites";

function formatDuration(secs?: number): string {
  if (!secs || !Number.isFinite(secs) || secs <= 0) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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

function Heart({ trackId, initial, isLoggedIn }: { trackId: string; initial: boolean; isLoggedIn: boolean }) {
  const [fav, setFav] = useState(initial);
  const [pending, setPending] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      alert("Please sign in to favorite tracks.");
      return;
    }
    setPending(true);
    const prev = fav;
    setFav(!prev);
    const res = await toggleFavoriteAction(trackId, prev);
    if (!res.success) setFav(prev);
    setPending(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex-shrink-0 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
      style={{ color: fav ? "#f43f5e" : "var(--text-muted)" }}
      title="Favorite"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}

const GRADIENTS: [string, string][] = [
  ["#14b8a6", "#06b6d4"],
  ["#6366f1", "#8b5cf6"],
  ["#f43f5e", "#ec4899"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#059669"],
  ["#3b82f6", "#6366f1"],
];
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function ArtistPopularList({
  tracks,
  userFavorites,
  isLoggedIn,
}: {
  tracks: Track[];
  userFavorites: string[];
  isLoggedIn: boolean;
}) {
  const { playTrack, tracks: queue, currentTrackIndex, isPlaying } = usePlayer();
  const currentId = queue[currentTrackIndex]?.id;

  if (tracks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Popular</h2>
        <Link href="#" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "var(--accent)" }}>
          View all
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-col">
        {tracks.map((track, i) => {
          const isCurrent = currentId === track.id;
          const dur = formatDuration(track.duration);
          const [c1, c2] = GRADIENTS[hashStr(track.title + track.category) % GRADIENTS.length];

          return (
            <div
              key={track.id}
              role="button"
              tabIndex={0}
              onClick={() => playTrack(tracks, i)}
              onKeyDown={(e) => e.key === "Enter" && playTrack(tracks, i)}
              className="group flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
              style={isCurrent ? { background: "var(--accent-glow)" } : undefined}
            >
              {/* Index */}
              <span className="w-6 text-center text-sm font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Cover */}
              <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 shadow">
                {track.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                  </div>
                )}
              </div>

              {/* Title */}
              <span className="flex-1 text-sm font-semibold truncate" style={{ color: isCurrent ? "var(--accent)" : "var(--text-primary)" }}>
                {cleanTitle(track.title)}
              </span>

              {/* Equalizer for the active track */}
              {isCurrent && <Equalizer playing={isPlaying} />}

              {/* Duration */}
              <span className="text-xs flex-shrink-0 tabular-nums w-9 text-right" style={{ color: "var(--text-muted)" }}>
                {dur}
              </span>

              {/* Heart */}
              <Heart trackId={track.id} initial={userFavorites.includes(track.id)} isLoggedIn={isLoggedIn} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
