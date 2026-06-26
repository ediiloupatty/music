import BrowseShell from "@/components/BrowseShell";
import AlbumSection from "@/components/AlbumSection";

export const dynamic = "force-dynamic";

export default function AlbumsPage() {
  return (
    <BrowseShell>
      <AlbumSection currentAlbum={null} heading="Albums" />
    </BrowseShell>
  );
}
