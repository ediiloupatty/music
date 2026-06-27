"use client";

import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";
import type { Track } from "@/lib/cloudflare";

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

// Slide-in "Up Next" drawer. Reads the upcoming queue from the player and lets
// the user jump straight to any track (respects shuffle order).
export default function QueuePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tracks, currentTrackIndex, upcoming, setCurrentTrackIndex } = usePlayer();
  const current = tracks[currentTrackIndex];

  if (!open) return null;

  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-[150]" onClick={onClose} />

      <aside
        role="dialog"
        aria-label="Play queue"
        className="fixed right-0 top-0 bottom-0 w-[340px] max-w-[85vw] z-[160] flex flex-col fade-in shadow-2xl"
        style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-card)" }}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
            Queue
          </h2>
          <button
            onClick={onClose}
            aria-label="Close queue"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)]"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {current && (
            <>
              <p className="px-2 mb-2 text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
                Now playing
              </p>
              <div className="flex items-center gap-3 p-2 rounded-xl mb-4" style={{ background: "var(--accent-glow)" }}>
                <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0">
                  <MiniCover track={current} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--accent)" }}>
                    {cleanTitle(current.title)}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {current.artist || current.category}
                  </p>
                </div>
              </div>
            </>
          )}

          <p className="px-2 mb-2 text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-muted)" }}>
            Up next
          </p>
          {upcoming.length === 0 ? (
            <p className="px-2 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing queued — this is the last track.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {upcoming.map((u, i) => (
                <button
                  key={`${u.index}-${i}`}
                  onClick={() => setCurrentTrackIndex(u.index)}
                  className="group flex items-center gap-3 p-2 rounded-xl text-left transition-colors hover:bg-[var(--bg-card-hover)]"
                >
                  <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0">
                    <MiniCover track={u.track} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {cleanTitle(u.track.title)}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {u.track.artist || u.track.category}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
