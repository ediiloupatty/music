"use client";

import Link from "next/link";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/CoverImage";
import TrackDuration from "@/components/TrackDuration";

export default function CompactTrackList({
  heading,
  tracks,
  actionType = "play",
}: {
  heading: string;
  tracks: Track[];
  actionType?: "play" | "heart";
}) {
  const { playTrack, tracks: playerTracks, currentTrackIndex } = usePlayer();
  const currentTrack = playerTracks[currentTrackIndex];

  if (!tracks || tracks.length === 0) return null;

  return (
    <div 
      className="w-full rounded-2xl p-5 md:p-6 shadow-md"
      style={{ background: "var(--bg-primary)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
          {heading}
        </h2>
        <Link href="#" className="text-sm font-semibold hover:underline" style={{ color: "#14b8a6" }}>
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id;
          
          return (
            <div
              key={track.id}
              className="group flex items-center justify-between p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
              onClick={() => playTrack(tracks, index)}
            >
              {/* Left side: Cover + Info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                  {track.cover_url ? (
                    <CoverImage src={track.cover_url} alt={track.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="opacity-50">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                       <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate" style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}>
                    {track.title}
                  </span>
                  <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {track.artist || "Unknown Artist"}
                  </span>
                </div>
              </div>

              {/* Right side: Duration + Action Icon */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <TrackDuration
                  track={track}
                  className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                />
                
                {actionType === "play" ? (
                  <button className="w-8 h-8 rounded-full flex items-center justify-center border transition-all hover:bg-white/10" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                ) : (
                  <button className="w-8 h-8 flex items-center justify-center transition-all hover:scale-110" style={{ color: "#14b8a6" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
