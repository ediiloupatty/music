import BrowseShell from "@/components/BrowseShell";
import PlaylistGrid from "@/components/PlaylistGrid";
import { getPlaylists } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();
  return (
    <BrowseShell>
      <PlaylistGrid heading="Playlists" playlists={playlists} wrap />
    </BrowseShell>
  );
}
