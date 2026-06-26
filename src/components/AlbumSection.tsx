"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Album = {
  name: string;
  trackCount: number;
  artist?: string;
  cover_url?: string;
  source: "embedded" | "uploaded" | "none";
};

const COVER_PALETTES: [string, string][] = [
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

export default function AlbumSection({ currentAlbum }: { currentAlbum: string | null }) {
  const router = useRouter();
  const { data } = useSWR<{ albums: Album[] }>("/api/albums", fetcher, {
    revalidateOnFocus: false,
  });

  const albums = data?.albums || [];
  if (albums.length === 0) return null;

  function toggleAlbum(name: string) {
    if (currentAlbum === name) router.push("/");
    else router.push(`/?album=${encodeURIComponent(name)}`);
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
        Albums
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {albums.map((al) => {
          const isActive = currentAlbum === al.name;
          const [c1, c2] = COVER_PALETTES[hashStr(al.name) % COVER_PALETTES.length];
          return (
            <div
              key={al.name}
              role="button"
              tabIndex={0}
              onClick={() => toggleAlbum(al.name)}
              onKeyDown={(e) => e.key === "Enter" && toggleAlbum(al.name)}
              className="group flex flex-col gap-2 text-left transition-all cursor-pointer"
            >
              {/* Cover — blends with the page background, slightly rounded square */}
              <div
                className="relative w-full aspect-square rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]"
                style={isActive ? { outline: "2px solid var(--accent)", outlineOffset: "2px" } : undefined}
              >
                {al.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={al.cover_url} alt={al.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="opacity-90 drop-shadow">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
                {/* Play overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: "var(--accent)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Name + meta */}
              <div>
                <p
                  className="font-semibold text-xs truncate leading-tight"
                  style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                >
                  {al.name}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {al.artist ? `${al.artist} · ` : ""}
                  {al.trackCount} track{al.trackCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
