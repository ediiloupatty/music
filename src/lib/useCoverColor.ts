"use client";

import { useEffect, useState } from "react";

export type RGB = { r: number; g: number; b: number };

// Extracts a vibrant dominant colour from a cover image so the UI can tint
// itself to match the artwork. Works because the (mock) covers are served
// same-origin from /covers — canvas pixel reading isn't blocked by CORS.
export function useCoverColor(coverUrl?: string): RGB | null {
  const [color, setColor] = useState<RGB | null>(null);

  useEffect(() => {
    if (!coverUrl) {
      setColor(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = coverUrl;

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 28;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let best = { score: -1, r: 0, g: 0, b: 0 };
        let sr = 0, sg = 0, sb = 0, n = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          sr += r; sg += g; sb += b; n++;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          // Prefer saturated, mid-bright colours (avoid near-black / near-white).
          const score = sat * (1 - Math.abs(lum - 0.5) * 1.1);
          if (score > best.score) best = { score, r, g, b };
        }
        if (n === 0) return;

        // Fall back to the average colour if nothing vibrant was found.
        const chosen = best.score > 0.12 ? best : { r: sr / n, g: sg / n, b: sb / n };
        if (!cancelled) {
          setColor({ r: Math.round(chosen.r), g: Math.round(chosen.g), b: Math.round(chosen.b) });
        }
      } catch {
        /* tainted canvas / decode error — keep the previous/null colour */
      }
    };
    img.onerror = () => { if (!cancelled) setColor(null); };

    return () => { cancelled = true; };
  }, [coverUrl]);

  return color;
}
