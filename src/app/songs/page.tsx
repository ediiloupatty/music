import BrowseShell from "@/components/BrowseShell";
import MainTracksContainer from "@/components/MainTracksContainer";
import { getTracksByCategory, getUserFavorites } from "@/lib/cloudflare";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function SongsPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const userFavorites =
    isLoggedIn && session.user?.email ? await getUserFavorites(session.user.email) : [];
  const tracks = await getTracksByCategory(null);

  return (
    <BrowseShell>
      <h1 className="text-xl font-black mb-5" style={{ color: "var(--text-primary)" }}>
        Songs
      </h1>
      <MainTracksContainer
        initialTracks={tracks}
        currentCategory={null}
        userFavorites={userFavorites}
        isLoggedIn={isLoggedIn}
        columns
      />
    </BrowseShell>
  );
}
