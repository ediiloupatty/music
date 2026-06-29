"use client";

import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";
import { formatDuration } from "@/lib/utils";
import type { Track } from "@/lib/cloudflare";
import { formatAudioSpecs } from "@/lib/formatSpecs";

function MiniCover({ track }: { track: Track }) {
  if (track.cover_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={track.cover_url} alt="" loading="lazy" className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent), #6366f1)" }}>
      <svg width="40%" height="40%" viewBox="0 0 24 24" fill="white" className="opacity-90">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    </div>
  );
}

function HiResDetail({ track, accent, coverColor }: { 
  track: Track; 
  accent?: string; 
  coverColor?: { r: number; g: number; b: number }; 
}) {
  const specs = formatAudioSpecs(track);
  if (!specs) return null;

  const isHiRes = (track.bit_depth && track.bit_depth >= 24) ||
    (track.sample_rate && track.sample_rate > 44100);

  return (
    <div
      className="mx-3 mb-3 rounded-xl p-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--bg-card-hover)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-secondary)" }}>
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <span className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: "var(--text-secondary)" }}>
          Audio Quality
        </span>
        {isHiRes && (
          <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-black tracking-wider" style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}>
            HI-RES
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {track.bit_depth && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--bg-card-hover)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-secondary)" }}>
              Bit Depth
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {track.bit_depth}-bit
            </p>
          </div>
        )}
        {track.sample_rate && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--bg-card-hover)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-secondary)" }}>
              Sample Rate
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {(track.sample_rate / 1000).toFixed(track.sample_rate % 1000 === 0 ? 0 : 1)} kHz
            </p>
          </div>
        )}
        {track.file_url && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--bg-card-hover)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-secondary)" }}>
              Format
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {track.file_url.includes(".flac") ? "FLAC" : track.file_url.includes(".wav") ? "WAV" : track.file_url.includes(".mp3") ? "MP3" : "Audio"}
            </p>
          </div>
        )}
        {track.duration && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--bg-card-hover)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-secondary)" }}>
              Duration
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {formatDuration(track.duration)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Slide-in "Up Next" drawer. Reads the upcoming queue from the player and lets
// the user jump straight to any track (respects shuffle order).
export default function QueuePanel({ 
  open, 
  onClose, 
  accent = "var(--accent)", 
  accentSoft = "rgba(45, 212, 191, 0.5)", 
  coverColor = { r: 45, g: 212, b: 191 } 
}: { 
  open: boolean; 
  onClose: () => void; 
  accent?: string; 
  accentSoft?: string; 
  coverColor?: { r: number; g: number; b: number }; 
}) {
  const { tracks, currentTrackIndex, upcoming, setCurrentTrackIndex } = usePlayer();
  const current = tracks[currentTrackIndex];

  return (
    <>
      {/* Click-away backdrop (mobile only, desktop shifts main layout) */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[77px] md:top-[89px] z-40 bg-black/30 queue-backdrop-in md:hidden" onClick={onClose} />
      )}

      <aside
        role="dialog"
        aria-label="Play queue"
        className={`fixed right-0 top-[77px] md:top-[89px] bottom-24 w-[300px] max-w-[88vw] z-[45] flex flex-col shadow-2xl transition-transform duration-500 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "transparent",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        {/* ─── Sticky Header ─── */}
        <header
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 sticky top-0 z-20"
          style={{
            background: "transparent",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
            Queue
          </h2>
          <button
            onClick={onClose}
            aria-label="Close queue"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--bg-card-hover)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </header>

        {/* ─── Scrollable Content ─── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {current && (
            <div className="px-3 pt-5">
              <p className="px-2 mb-2.5 text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-secondary)" }}>
                Now playing
              </p>
              <div className="flex items-center gap-3 p-2.5 rounded-xl mb-2" style={{ 
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}>
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                  <MiniCover track={current} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                    {cleanTitle(current.title)}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {current.artist || current.category}
                  </p>
                  {current.duration && (
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {formatDuration(current.duration)}
                    </p>
                  )}
                </div>
                {/* Equalizer animation */}
                <div className="flex items-end gap-[2px] h-4 flex-shrink-0 pr-1">
                  <span className="eq-bar" style={{ background: "var(--text-secondary)", animationDelay: "0s" }} />
                  <span className="eq-bar" style={{ background: "var(--text-secondary)", animationDelay: "0.2s" }} />
                  <span className="eq-bar" style={{ background: "var(--text-secondary)", animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}

          {/* Hi-Res Detail */}
          {current && <HiResDetail track={current} accent={accent} coverColor={coverColor} />}

          {/* ─── Up Next ─── */}
          <div className="px-3 pb-32">
            <div className="flex items-center justify-between px-2 mb-2 mt-1">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-secondary)" }}>
                Up next
              </p>
              {upcoming.length > 0 && (
                <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {upcoming.length} track{upcoming.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                  style={{ background: "var(--bg-card)" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)" }}>
                    <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  No more tracks
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  This is the last track in the queue.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {upcoming.map((u, i) => (
                  <button
                    key={`${u.index}-${i}`}
                    onClick={() => setCurrentTrackIndex(u.index)}
                    className="group queue-item-in flex items-center gap-3 p-2 rounded-xl text-left transition-colors hover:bg-[var(--bg-card-hover)]"
                    style={{ animationDelay: `${0.08 + Math.min(i, 8) * 0.04}s` }}
                  >
                    {/* Track number */}
                    <span
                      className="w-5 text-center text-[11px] font-semibold flex-shrink-0 tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {i + 1}
                    </span>
                    <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                      <MiniCover track={u.track} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate group-hover:text-[var(--accent)] transition-colors" style={{ color: "var(--text-primary)" }}>
                        {cleanTitle(u.track.title)}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {u.track.artist || u.track.category}
                      </p>
                    </div>
                    {u.track.duration && (
                      <span className="text-[10px] font-medium flex-shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {formatDuration(u.track.duration)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
