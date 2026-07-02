"use client";

import { useCallback, useState } from "react";
import useSWRImmutable from "swr/immutable";
import AISearchBar from "@/components/AISearchBar";
import { Track } from "@/lib/cloudflare";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<{ tracks: Track[] }>);

// The full track index used to be fetched server-side in TopHeader and
// serialized into the payload of EVERY page that shows the header. Fetching it
// here, lazily on the first focus of the search input, keeps that weight off
// every navigation — SWR's cache makes it a one-time cost per session.
export default function AISearchBarWrapper() {
  const [activated, setActivated] = useState(false);
  const { data } = useSWRImmutable(activated ? "/api/tracks" : null, fetcher);

  const handleActivate = useCallback(() => setActivated(true), []);
  const handleFilteredTracks = useCallback(() => {
    // No-op for non-home pages since search results are displayed in the popover dropdown
  }, []);

  return (
    <AISearchBar
      allTracks={data?.tracks ?? []}
      onFilteredTracks={handleFilteredTracks}
      onActivate={handleActivate}
    />
  );
}
