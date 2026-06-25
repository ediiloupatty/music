"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { CATEGORIES } from "@/lib/constants";

export default function DynamicBackground() {
  const { tracks, currentTrackIndex, isPlaying } = usePlayer();
  const [bgImage, setBgImage] = useState<string>("");

  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      const track = tracks[currentTrackIndex];
      // Use the track's embedded cover image, or fallback to a unique seeded image
      setBgImage(track.cover_url || `https://picsum.photos/seed/${encodeURIComponent(track.title)}/1200/800`);
    } else {
      // Default minimalist background or fallback image
      setBgImage("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"); 
    }
  }, [tracks, currentTrackIndex, isPlaying]);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#3B4252]">
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000 ease-in-out opacity-20"
        style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}
      />
      {/* Heavy monochromatic dark overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3B4252]/80 via-[#3B4252]/90 to-[#3B4252] z-[1]" />
    </div>
  );
}
