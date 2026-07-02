import Link from "next/link";
import { auth } from "@/auth";
import BrowseShell from "@/components/BrowseShell";
import { getRecentlyPlayed, getUserFavorites } from "@/lib/cloudflare";
import MainTracksContainer from "@/components/MainTracksContainer";

export const dynamic = "force-dynamic";

export default async function RecentlyPlayedPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const userEmail = session?.user?.email || null;
  const [userFavorites, recentlyPlayedTracks] = await Promise.all([
    userEmail ? getUserFavorites(userEmail) : Promise.resolve([]),
    getRecentlyPlayed(userEmail, 100),
  ]);

  return (
    <BrowseShell>
      <h1 className="text-xl font-black mb-5" style={{ color: "var(--text-primary)" }}>
        Recently Played
      </h1>

      {recentlyPlayedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--bg-secondary)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-base" style={{ color: "var(--text-secondary)" }}>
            No recent tracks
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your recently played music will appear here.
          </p>
          <Link
            href="/player"
            className="mt-2 px-6 py-2.5 rounded-full font-semibold text-sm text-white"
            style={{ background: "var(--accent)" }}
          >
            Explore Music
          </Link>
        </div>
      ) : (
        <MainTracksContainer
          initialTracks={recentlyPlayedTracks}
          currentCategory={null}
          userFavorites={userFavorites}
          isLoggedIn={isLoggedIn}
          columns
        />
      )}
    </BrowseShell>
  );
}
