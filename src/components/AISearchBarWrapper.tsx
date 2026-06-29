"use client";

import { useCallback } from "react";
import AISearchBar from "@/components/AISearchBar";
import { Track } from "@/lib/cloudflare";

export default function AISearchBarWrapper({ allTracks }: { allTracks: Track[] }) {
  const handleFilteredTracks = useCallback(() => {
    // No-op for non-home pages since search results are displayed in the popover dropdown
  }, []);

  return <AISearchBar allTracks={allTracks} onFilteredTracks={handleFilteredTracks} />;
}
