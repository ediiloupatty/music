import BrowseShell from "@/components/BrowseShell";
import ArtistGrid from "@/components/ArtistGrid";
import { getArtists } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  const artists = await getArtists();
  return (
    <BrowseShell>
      <ArtistGrid heading="Artists" artists={artists} wrap />
    </BrowseShell>
  );
}
