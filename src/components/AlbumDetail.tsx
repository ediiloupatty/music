"use client";

import { useState } from "react";
import Link from "next/link";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";
import { toggleFavoriteAction } from "@/app/actions/favorites";

function formatDuration(secs?: number): string {
  if (!secs || !Number.isFinite(secs) || secs <= 0) return "--:--";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatPlays(n?: number): string {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// Trigger a browser download for a single track (works for our same-origin
// /api/* file routes; cross-origin URLs just open instead).
function downloadTrack(t: Track) {
  const a = document.createElement("a");
  a.href = t.file_url;
  const ext = (t.file_url.split("?")[0].split(".").pop() || "mp3").toLowerCase();
  a.download = `${t.artist ? t.artist + " - " : ""}${cleanTitle(t.title)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const PALETTES: [string, string][] = [
  ["#6366f1", "#8b5cf6"],
  ["#14b8a6", "#06b6d4"],
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

function Heart({ trackId, initial, isLoggedIn }: { trackId: string; initial: boolean; isLoggedIn: boolean }) {
  const [fav, setFav] = useState(initial);
  const [pending, setPending] = useState(false);
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) return alert("Please sign in to favorite tracks.");
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
      className="transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
      style={{ color: fav ? "#f43f5e" : "var(--text-muted)" }}
      title="Favorite"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
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

export default function AlbumDetail({
  name,
  tracks,
  artist,
  year,
  coverUrl,
  userFavorites,
  isLoggedIn,
}: {
  name: string;
  tracks: Track[];
  artist?: string;
  year?: number;
  coverUrl?: string;
  userFavorites: string[];
  isLoggedIn: boolean;
}) {
  const { playTrack, tracks: queue, currentTrackIndex, isPlaying, setIsPlaying } = usePlayer();
  const [liked, setLiked] = useState(false);

  const current = queue[currentTrackIndex];
  const isThisAlbum = !!current && tracks.some((t) => t.id === current.id);
  const albumPlaying = isThisAlbum && isPlaying;

  const totalSecs = tracks.reduce((a, t) => a + (t.duration || 0), 0);
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.floor(totalSecs % 60);
  const hrs = Math.floor(mins / 60);
  const durStr = hrs > 0 ? `${hrs} hr ${mins % 60} min` : `${mins} min ${secs} sec`;

  const [c1, c2] = PALETTES[hashStr(name) % PALETTES.length];

  const handlePlayAll = () => {
    if (isThisAlbum) return setIsPlaying(!isPlaying);
    if (tracks.length) playTrack(tracks, 0);
  };

  const downloadAll = async () => {
    for (const t of tracks) {
      downloadTrack(t);
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* Back */}
      <div className="absolute top-5 left-5 z-30">
        <Link
          href="/"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </Link>
      </div>

      <div className="relative z-10 px-5 sm:px-8 md:px-12 pt-20 pb-44">
        {/* ── Header: cover + info ── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-10">
          {/* Cover */}
          <div className="w-[170px] h-[170px] lg:w-[190px] lg:h-[190px] rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white" className="opacity-80"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
            <p className="text-[12px] font-black tracking-[0.4em] uppercase mb-2" style={{ color: "var(--accent)" }}>Album</p>
            <h1 className="font-black leading-none mb-3 drop-shadow-xl break-words" style={{ color: "#fff", fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.02em" }}>
              {name}
            </h1>
            <p className="text-[14px] font-medium mb-6 flex items-center gap-2 flex-wrap justify-center sm:justify-start" style={{ color: "rgba(255,255,255,0.75)" }}>
              {artist && (
                <Link href={`/artist/${encodeURIComponent(artist)}`} className="font-bold hover:underline" style={{ color: "#fff" }}>
                  {artist}
                </Link>
              )}
              {artist && <span style={{ color: "var(--text-muted)" }}>•</span>}
              {year && <span>{year}</span>}
              {year && <span style={{ color: "var(--text-muted)" }}>•</span>}
              <span>{tracks.length} tracks, {durStr}</span>
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
              <button
                onClick={handlePlayAll}
                disabled={tracks.length === 0}
                className="flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "var(--accent)", boxShadow: "0 8px 24px var(--accent-glow)" }}
              >
                {albumPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
                {albumPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => setLiked((v) => !v)}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ border: "1px solid var(--border-card)", color: liked ? "#f43f5e" : "var(--text-secondary)" }}
                title="Like album"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              </button>
              <button
                onClick={downloadAll}
                disabled={tracks.length === 0}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{ border: "1px solid var(--border-card)", color: "var(--text-secondary)" }}
                title="Download album"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
              </button>
              <button
                className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ border: "1px solid var(--border-card)", color: "var(--text-secondary)" }}
                title="More"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Track table ── */}
        {/* Column header */}
        <div
          className="hidden md:flex items-center gap-4 px-4 pb-3 mb-1 border-b text-[11px] font-bold tracking-wider uppercase"
          style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}
        >
          <span className="w-6 text-center flex-shrink-0">#</span>
          <span className="flex-1 min-w-0">Title</span>
          <span className="w-28 text-right flex-shrink-0">Plays</span>
          <span className="w-14 text-right flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
          </span>
          <span className="w-20 flex-shrink-0" />
        </div>

        <div className="flex flex-col">
          {tracks.map((track, i) => {
            const isCurrent = current?.id === track.id;
            return (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => playTrack(tracks, i)}
                onKeyDown={(e) => e.key === "Enter" && playTrack(tracks, i)}
                className="track-row flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer group"
                style={isCurrent ? { background: "var(--accent-glow)" } : undefined}
              >
                {/* Index / equalizer / play */}
                <span className="w-6 flex items-center justify-center flex-shrink-0">
                  {isCurrent ? (
                    <Equalizer playing={isPlaying} />
                  ) : (
                    <>
                      <span className="text-sm font-mono group-hover:hidden" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="hidden group-hover:block" style={{ color: "var(--accent)" }}><path d="M8 5v14l11-7z" /></svg>
                    </>
                  )}
                </span>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: isCurrent ? "var(--accent)" : "var(--text-primary)" }}>
                    {cleanTitle(track.title)}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{track.artist || track.category}</p>
                </div>

                {/* Plays */}
                <span className="hidden md:block w-28 text-right text-sm tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {formatPlays(track.play_count)}
                </span>

                {/* Duration */}
                <span className="w-14 text-right text-sm font-mono tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {formatDuration(track.duration)}
                </span>

                {/* Heart + download */}
                <div className="w-20 flex items-center justify-end gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Heart trackId={track.id} initial={userFavorites.includes(track.id)} isLoggedIn={isLoggedIn} />
                  <button
                    onClick={() => downloadTrack(track)}
                    className="transition-all hover:scale-110 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                    style={{ color: "var(--text-muted)" }}
                    title="Download"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
