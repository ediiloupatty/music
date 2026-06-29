"use client";

import { useState } from "react";
import Link from "next/link";
import type { Album, Artist, Track } from "@/lib/cloudflare";
import ArtistPlayButton from "@/components/ArtistPlayButton";
import ArtistPopularList from "@/components/ArtistPopularList";
import ArtistAlbums from "@/components/ArtistAlbums";
import CoverImage from "@/components/CoverImage";

type AlbumWithYear = Album & { year?: number };

export default function ArtistView({
  name,
  info,
  tracks,
  popular,
  albums,
  trackCount,
  albumCount,
  userFavorites,
  isLoggedIn,
  c1,
  c2,
}: {
  name: string;
  info: Artist | null;
  tracks: Track[];
  popular: Track[];
  albums: AlbumWithYear[];
  trackCount: number;
  albumCount: number;
  userFavorites: string[];
  isLoggedIn: boolean;
  c1: string;
  c2: string;
}) {
  // Clicking an album card swaps the big hero photo to that album's cover.
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [heroCover, setHeroCover] = useState<string | undefined>(undefined);

  const heroSrc = heroCover ?? info?.image_url;

  const handleSelectAlbum = (al: AlbumWithYear) => {
    if (selectedAlbum === al.name) {
      setSelectedAlbum(null);
      setHeroCover(undefined);
    } else {
      setSelectedAlbum(al.name);
      setHeroCover(al.cover_url);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* ── Big hero photo (top-right) — swaps to the selected album cover ── */}
      {heroSrc && (
        <div className="absolute top-0 right-0 w-[52%] h-[64%] z-0 pointer-events-none select-none">
          <CoverImage src={heroSrc} alt={name} imageClassName="object-cover object-top fade-in" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #0d111c 0%, rgba(13,17,28,0) 32%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 52%, #0d111c 96%)" }} />
        </div>
      )}

      {/* ── Content grid ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-x-8 xl:gap-x-12 gap-y-10 px-5 sm:px-8 md:px-14 pt-10 pb-44 min-h-screen">

        {/* (1,1) — CD avatar */}
        <div className="flex justify-center lg:justify-start">
          <div className="select-none relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px] xl:w-[270px] xl:h-[270px]">
            {/* Concentric teal rings — dissolve into the background toward the edges */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  "repeating-radial-gradient(circle at 50% 50%, rgba(6,182,212,0) 0px, rgba(6,182,212,0) 7px, rgba(6,182,212,0.22) 7px, rgba(6,182,212,0.22) 8.5px)",
                maskImage: "radial-gradient(circle, #000 26%, rgba(0,0,0,0.65) 52%, transparent 88%)",
                WebkitMaskImage: "radial-gradient(circle, #000 26%, rgba(0,0,0,0.65) 52%, transparent 88%)",
              }}
            />
            {/* Photo label in the centre of the record */}
            <div className="absolute rounded-full overflow-hidden" style={{ inset: "28%" }}>
              {info?.image_url ? (
                <CoverImage src={info.image_url} alt={name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                  <span className="text-4xl font-black text-white drop-shadow">{name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            {/* Bright teal ring hugging the photo label */}
            <div className="absolute rounded-full pointer-events-none" style={{ inset: "28%", border: "2px solid rgba(6,182,212,0.85)" }} />
            {/* Glowing top-left arc accent */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: "24%",
                borderTop: "3px solid #06b6d4",
                borderLeft: "3px solid #06b6d4",
                borderRight: "3px solid transparent",
                borderBottom: "3px solid transparent",
                transform: "rotate(-30deg)",
                filter: "drop-shadow(0 0 6px rgba(6,182,212,0.8))",
              }}
            />
            {/* Floating dots */}
            <div className="absolute rounded-full" style={{ width: 3, height: 3, background: "#06b6d4", top: "16%", left: "26%", boxShadow: "0 0 6px 1px #06b6d4" }} />
            <div className="absolute rounded-full" style={{ width: 2, height: 2, background: "#06b6d4", bottom: "22%", right: "14%", boxShadow: "0 0 4px 1px #06b6d4" }} />
            <div className="absolute rounded-full" style={{ width: 3, height: 3, background: "#06b6d4", top: "54%", left: "6%", boxShadow: "0 0 6px 1px #06b6d4" }} />
          </div>
        </div>

        {/* (1,2) — Artist name, stats, actions */}
        <div className="flex flex-col justify-center items-center lg:items-start text-center lg:text-left max-w-[560px]">
          <p className="text-[12px] font-black tracking-[0.4em] uppercase mb-2" style={{ color: "var(--accent)" }}>
            Artist
          </p>
          <h1
            className="font-black leading-none mb-4 drop-shadow-xl break-words"
            style={{ color: "#fff", fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.02em" }}
          >
            {name}
          </h1>
          <p className="text-[15px] mb-7 font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            {albumCount} album{albumCount !== 1 ? "s" : ""} • {trackCount} track{trackCount !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center lg:justify-start">
            <ArtistPlayButton tracks={tracks} />
            <button
              className="px-7 sm:px-8 py-3 rounded-full text-[15px] font-semibold transition-all hover:bg-white/10 active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.9)" }}
            >
              Follow
            </button>
            <button
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.9)" }}
              title="More"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* (2,1) — Popular (nudged down for breathing room) */}
        <div className="lg:mt-6">
          <ArtistPopularList tracks={popular} userFavorites={userFavorites} isLoggedIn={isLoggedIn} />
        </div>

        {/* (2,2) — Albums (bleeds to the right edge) */}
        <div className="lg:mt-6 -mr-5 sm:-mr-8 md:-mr-14">
          <ArtistAlbums albums={albums} selectedName={selectedAlbum} onSelect={handleSelectAlbum} />
        </div>
      </div>
    </div>
  );
}
