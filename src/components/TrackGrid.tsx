"use client";

import Link from "next/link";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import { cleanTitle } from "@/lib/cleanTitle";

const PALETTES: [string, string][] = [
  ["#6366f1", "#8b5cf6"],
  ["#14b8a6", "#06b6d4"],
  ["#f43f5e", "#ec4899"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#059669"],
  ["#3b82f6", "#6366f1"],
];
const ICONS = [
  "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  "M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z",
];
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Cover({ track, rounded }: { track: Track; rounded: string }) {
  if (track.cover_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={track.cover_url} alt={track.title} className={`w-full h-full object-cover ${rounded}`} />;
  }
  const [c1, c2] = PALETTES[hashStr(track.title + track.category) % PALETTES.length];
  const icon = ICONS[hashStr(track.title) % ICONS.length];
  return (
    <div className={`w-full h-full flex items-center justify-center ${rounded}`} style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <svg width="40%" height="40%" viewBox="0 0 24 24" fill="white" className="opacity-90 drop-shadow">
        <path d={icon} />
      </svg>
    </div>
  );
}

export default function TrackGrid({
  heading,
  tracks,
  layout = "vertical",
}: {
  heading: string;
  tracks: Track[];
  layout?: "vertical" | "horizontal";
}) {
  const { playTrack } = usePlayer();
  if (!tracks.length) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
        {heading}
      </h2>

      {layout === "horizontal" ? (
        // Recently played — 3 columns of [square cover | title + artist]
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.map((t, i) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => playTrack(tracks, i)}
              onKeyDown={(e) => e.key === "Enter" && playTrack(tracks, i)}
              className="group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all"
              style={{ background: "var(--bg-secondary)" }}
            >
              <div className="relative w-14 h-14 flex-shrink-0">
                <Cover track={t} rounded="rounded-lg" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {cleanTitle(t.title)}
                </p>
                {t.artist ? (
                  <Link
                    href={`/artist/${encodeURIComponent(t.artist)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs truncate block hover:underline w-fit max-w-full"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t.artist}
                  </Link>
                ) : (
                  <span className="text-xs truncate block" style={{ color: "var(--text-muted)" }}>{t.category}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // New tracks — cover on top, title + artist below (blends with bg)
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tracks.map((t, i) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => playTrack(tracks, i)}
              onKeyDown={(e) => e.key === "Enter" && playTrack(tracks, i)}
              className="group flex flex-col gap-2 cursor-pointer"
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
                <Cover track={t} rounded="" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--accent)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-xs truncate leading-tight" style={{ color: "var(--text-primary)" }}>
                  {cleanTitle(t.title)}
                </p>
                {t.artist ? (
                  <Link
                    href={`/artist/${encodeURIComponent(t.artist)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] truncate block hover:underline w-fit max-w-full mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t.artist}
                  </Link>
                ) : (
                  <span className="text-[10px] truncate block mt-0.5" style={{ color: "var(--text-muted)" }}>{t.category}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
