"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Album } from "@/lib/cloudflare";

type AlbumWithYear = Album & { year?: number };

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

interface Props {
  albums: AlbumWithYear[];
  selectedName: string | null;
  onSelect: (album: AlbumWithYear) => void;
}

export default function ArtistAlbums({ albums, selectedName, onSelect }: Props) {
  const router = useRouter();

  if (albums.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Albums</h2>
        <Link
          href="#"
          className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: "var(--accent)" }}
        >
          View all
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Album cards — portrait. Click a card to swap the hero background; the
          play button opens the album playlist. No hover-grow / side glow. */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
        {albums.map((al) => {
          const [a1, a2] = GRADIENTS[hashStr(al.name) % GRADIENTS.length];
          const isSelected = selectedName === al.name;
          const meta = [al.year, `${al.trackCount} track${al.trackCount !== 1 ? "s" : ""}`]
            .filter(Boolean)
            .join(" • ");

          return (
            <div
              key={al.name}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(al)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(al)}
              className="group flex-shrink-0 cursor-pointer focus:outline-none"
              style={{ width: 215 }}
            >
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  width: 215,
                  height: 270,
                  border: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {al.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={al.cover_url} alt={al.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${a1}, ${a2})` }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="white" className="opacity-80">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}

                {/* Bottom gradient + meta */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-4"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 55%)" }}
                >
                  <p className="font-bold text-[16px] text-white leading-tight line-clamp-2 drop-shadow">{al.name}</p>
                  {meta && (
                    <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{meta}</p>
                  )}
                </div>

                {/* Play → opens the album playlist */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/album/${encodeURIComponent(al.name)}`);
                  }}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "var(--accent)" }}
                  title="Open album"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
