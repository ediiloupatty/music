"use client";

import { useCallback } from "react";
import AISearchBar from "@/components/AISearchBar";

// Thin client wrapper so the (server) TopHeader can render the search bar.
// AISearchBar fetches its own full-library index lazily on first focus.
export default function AISearchBarWrapper() {
  const handleFilteredTracks = useCallback(() => {
    // No-op for non-home pages since search results are displayed in the popover dropdown
  }, []);

  return <AISearchBar onFilteredTracks={handleFilteredTracks} />;
}
