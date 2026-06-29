"use client";

import { useEffect, useState, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";

// Downscale the cover to a tiny thumbnail before blurring. A 140px CSS blur on
// a 32x32 canvas looks identical to blurring the full-resolution image but uses
// a fraction of the GPU memory and compositing cost — especially on mobile.
function downscaleCover(src: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.5));
      } else {
        resolve(src); // fallback: use original
      }
    };
    img.onerror = () => resolve(src); // fallback: use original
    img.src = src;
  });
}

export default function DynamicBackground() {
  const { tracks, currentTrackIndex } = usePlayer();
  const [bgImage, setBgImage] = useState<string>("");
  const lastUrlRef = useRef<string>("");

  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      const coverUrl = tracks[currentTrackIndex].cover_url || "";

      // Skip if the same cover is already displayed
      if (coverUrl === lastUrlRef.current) return;
      lastUrlRef.current = coverUrl;

      if (!coverUrl) {
        setBgImage("");
        return;
      }

      // Downscale to 32x32 — blur makes details irrelevant
      downscaleCover(coverUrl, 32).then(setBgImage);
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
            // The source is already a 32px thumbnail upscaled to fill the screen,
            // so it's extremely soft to begin with — a 60px blur looks identical
            // to the old 140px but costs the compositor a fraction as much.
            filter: "blur(60px)",
            transform: "scale(1.4)",
            opacity: 0.45,
            // No `willChange` here: it pinned this element to a permanently-live
            // GPU layer that kept re-compositing even while idle (a constant drain
            // while gaming). Without it the blurred layer is painted once and
            // cached; the 1.5s cross-track fade still runs fine.
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
