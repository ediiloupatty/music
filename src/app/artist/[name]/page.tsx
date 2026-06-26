import Link from "next/link";
import { auth } from "@/auth";
import {
  getArtistInfo,
  getTracksByArtist,
  getAlbums,
  getUserFavorites,
} from "@/lib/cloudflare";
import ArtistView from "@/components/ArtistView";
import Sidebar from "@/components/Sidebar";
import DynamicBackground from "@/components/DynamicBackground";

export const dynamic = "force-dynamic";

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
    getTracksByArtist(name),
    getAlbums(),
  ]);

  const albums = allAlbums.filter((a) => a.artist === name);
  const [c1, c2] = GRADIENTS[hashStr(name) % GRADIENTS.length];

  if (!info && tracks.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
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

  // Derive each album's year from its tracks (realtime — no hardcoded years).
  const albumsWithYear = albums.map((a) => ({
    ...a,
    year: tracks.find((t) => t.album === a.name)?.year,
  }));

  return (
    <div
      className="flex h-screen font-sans overflow-hidden relative gap-2"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* Same default backdrop as the home page (tints to the cover while playing) */}
      <DynamicBackground />

      {/* Sidebar menu */}
      <Sidebar />

      {/* ── MAIN AREA ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <ArtistView
          name={name}
          info={info}
          tracks={tracks}
          popular={popular}
          albums={albumsWithYear}
          trackCount={trackCount}
          albumCount={albumCount}
          userFavorites={userFavorites}
          isLoggedIn={isLoggedIn}
          c1={c1}
          c2={c2}
        />
      </div>
    </div>
  );
}
