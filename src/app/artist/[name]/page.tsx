import Link from "next/link";
import { auth } from "@/auth";
import {
  getArtistInfo,
  getTracksByArtist,
  getAlbums,
  getUserFavorites,
  Track,
} from "@/lib/cloudflare";
import MainTracksContainer from "@/components/MainTracksContainer";

export const dynamic = "force-dynamic";

const GRADIENTS: [string, string][] = [
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

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const session = await auth();
  const isLoggedIn = !!session?.user;
  const userFavorites =
    isLoggedIn && session.user?.email ? await getUserFavorites(session.user.email) : [];

  const [info, tracks, allAlbums] = await Promise.all([
    getArtistInfo(name),
    getTracksByArtist(name), // already ordered most-played first
    getAlbums(),
  ]);

  const albums = allAlbums.filter((a) => a.artist === name);
  const [c1, c2] = GRADIENTS[hashStr(name) % GRADIENTS.length];

  // Artist not found (no tracks)
  if (!info && tracks.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center"
        style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
      >
        <h1 className="text-2xl font-black">Artist not found</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No tracks by &quot;{name}&quot; in your library.
        </p>
        <Link href="/" className="px-6 py-2.5 rounded-full font-semibold text-sm text-white" style={{ background: "var(--accent)" }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const trackCount = info?.trackCount ?? tracks.length;
  const albumCount = info?.albumCount ?? albums.length;
  const popular = tracks.slice(0, 5);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* ── Page background derived from the artist photo ── */}
      {info?.image_url ? (
        <>
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-[70vh] -z-10"
            style={{
              backgroundImage: `url(${info.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              filter: "blur(60px) saturate(1.2) brightness(0.55)",
              transform: "scale(1.3)",
            }}
          />
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-[70vh] -z-10"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, var(--bg-base) 95%)" }}
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-[60vh] -z-10"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, opacity: 0.35 }}
          />
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-[60vh] -z-10"
            style={{ background: "linear-gradient(to bottom, transparent 30%, var(--bg-base) 95%)" }}
          />
        </>
      )}

      {/* Back button */}
      <div className="px-5 pt-6 relative z-10">
        <Link
          href="/"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: "rgba(0,0,0,0.35)", color: "#fff", backdropFilter: "blur(8px)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </Link>
      </div>

      {/* Artist identity */}
      <div className="flex items-end gap-5 px-5 pt-6 pb-8 relative z-10">
        <div
          className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
        >
          {info?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.image_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl sm:text-6xl font-black text-white drop-shadow">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "var(--accent-light)" }}>
            Artist
          </p>
          <h1 className="text-3xl sm:text-5xl font-black leading-none mb-2 drop-shadow-lg" style={{ color: "#fff" }}>
            {name}
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            {albumCount} album{albumCount !== 1 ? "s" : ""} · {trackCount} track{trackCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 pb-48 relative z-10">
        {/* Bio */}
        {info?.bio && (
          <p className="text-sm leading-relaxed mb-8 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            {info.bio}
          </p>
        )}

        {/* Popular (most played) */}
        {popular.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
              Popular
            </h2>
            <MainTracksContainer
              initialTracks={popular as Track[]}
              currentCategory={null}
              userFavorites={userFavorites}
              isLoggedIn={isLoggedIn}
              columns
            />
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
              Albums
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {albums.map((al) => {
                const [a1, a2] = GRADIENTS[hashStr(al.name) % GRADIENTS.length];
                return (
                  <Link
                    key={al.name}
                    href={`/?album=${encodeURIComponent(al.name)}`}
                    className="group flex flex-col gap-2 transition-all"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
                      {al.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={al.cover_url} alt={al.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${a1}, ${a2})` }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="white" className="opacity-90">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-xs truncate leading-tight" style={{ color: "var(--text-primary)" }}>
                      {al.name}
                    </p>
                    <p className="text-[10px] truncate -mt-1.5" style={{ color: "var(--text-muted)" }}>
                      {al.trackCount} track{al.trackCount !== 1 ? "s" : ""}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
