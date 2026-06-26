import type { Track } from "@/lib/cloudflare";

// Produces a Tidal-style quality label for a track.
//  - With bit depth + sample rate:  "24-bit 44.1kHz"
//  - Lossless file without specs:    "HI-RES"
//  - Otherwise:                      null (no badge)
export function formatAudioSpecs(track: Pick<Track, "file_url" | "bit_depth" | "sample_rate">): string | null {
  const { bit_depth, sample_rate, file_url } = track;

  if (bit_depth && sample_rate) {
    const khz = sample_rate / 1000;
    // Drop a trailing ".0" (44.1 stays, 48.0 -> 48)
    const khzStr = Number.isInteger(khz) ? String(khz) : khz.toFixed(1);
    return `${bit_depth}-bit ${khzStr}kHz`;
  }

  if (file_url && (file_url.endsWith(".flac") || file_url.endsWith(".wav"))) {
    return "HI-RES";
  }

  return null;
}
