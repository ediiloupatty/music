"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Track } from "@/lib/cloudflare";
import AISearchBar from "@/components/AISearchBar";
import MainTracksContainer from "@/components/MainTracksContainer";
import AlbumSection from "@/components/AlbumSection";
import TrackGrid from "@/components/TrackGrid";

type HomeContentProps = {
  tracks: Track[];
  currentCategory: string | null;
  currentAlbum?: string | null;
  recentlyPlayed: Track[];
  newTracks: Track[];
  userFavorites: string[];
  isLoggedIn: boolean;
};

export default function HomeContent({
  tracks,
  currentCategory,
  currentAlbum,
  recentlyPlayed,
  newTracks,
  userFavorites,
  isLoggedIn,
}: HomeContentProps) {
  const [filteredTracks, setFilteredTracks] = useState<Track[] | null>(null);
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);

  const handleFilteredTracks = useCallback((result: Track[] | null) => {
    setFilteredTracks(result);
  }, []);

  // Mount the search bar into the top-bar slot in page.tsx (top-center),
  // while keeping the filter state here so results drive the track list.
  useEffect(() => {
    setSearchSlot(document.getElementById("search-header-slot"));
  }, []);

  const isSearch = filteredTracks !== null;
  const isFiltered = isSearch || !!currentCategory || !!currentAlbum;
  const displayTracks = isSearch ? (filteredTracks as Track[]) : tracks;

  const searchBar =
    searchSlot &&
    createPortal(
      <AISearchBar allTracks={tracks} onFilteredTracks={handleFilteredTracks} />,
      searchSlot
    );

  // ── Curated home feed (no category / album / search active) ──
  if (!isFiltered) {
    return (
      <>
        {searchBar}
        <div className="mt-6">
          <TrackGrid heading="Recently Played" tracks={recentlyPlayed} layout="horizontal" />
          <AlbumSection currentAlbum={null} />
          <TrackGrid heading="New Tracks" tracks={newTracks} layout="vertical" />
        </div>
      </>
    );
  }

  // ── Filtered view: search / category / album → track list ──
  return (
    <>
      {searchBar}
      <div className="mt-6">
        <h2 className="text-xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
          {isSearch
            ? `Search Results (${displayTracks.length})`
            : currentAlbum
              ? `${currentAlbum}`
              : `${currentCategory}`}
        </h2>
        {isSearch && displayTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>
              No matching tracks found
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Try a different description or search term
            </p>
          </div>
        ) : (
          <MainTracksContainer
            key={isSearch ? `filtered-${displayTracks.map((t) => t.id).join(",")}` : currentAlbum || currentCategory || "all"}
            initialTracks={displayTracks}
            currentCategory={currentCategory}
            userFavorites={userFavorites}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>
    </>
  );
}
