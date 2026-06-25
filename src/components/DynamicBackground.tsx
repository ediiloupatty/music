"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";

export default function DynamicBackground() {
  const { tracks, currentTrackIndex } = usePlayer();
  const [bgImage, setBgImage] = useState<string>("");

  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      const track = tracks[currentTrackIndex];
      setBgImage(track.cover_url || "");
    }
  }, [tracks, currentTrackIndex]);

  return (
    <div
      className="absolute inset-0 w-full h-full z-0 overflow-hidden"
      style={{ background: "#0d111c" }}
    >
      {bgImage && (
        <div
          className="absolute inset-0 w-full h-full transition-all duration-[1500ms] ease-in-out"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(140px)",
            transform: "scale(1.5)",
            opacity: 0.45,
          }}
        />
      )}

      {/* Gradient overlay: biarkan warna tembus di atas, makin gelap ke bawah untuk keterbacaan */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(13,17,28,0.45) 0%, rgba(13,17,28,0.65) 40%, rgba(13,17,28,0.88) 100%)",
        }}
      />
    </div>
  );
}
