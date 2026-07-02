import BrowseShell from "@/components/BrowseShell";
import PlaylistGrid from "@/components/PlaylistGrid";
import { getPlaylists } from "@/lib/cloudflare";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const session = await auth();
  const playlists = await getPlaylists(session?.user?.email || null);
  return (
    <BrowseShell>
      <PlaylistGrid heading="Playlists" playlists={playlists} wrap />
    </BrowseShell>
  );
}
