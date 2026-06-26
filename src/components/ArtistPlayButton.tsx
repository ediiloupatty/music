"use client";

import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";

// Play / pause the whole artist track list. Reflects the real player state so
// the label flips to "Pause" while one of this artist's tracks is playing.
export default function ArtistPlayButton({ tracks }: { tracks: Track[] }) {
  const { playTrack, tracks: queue, currentTrackIndex, isPlaying, setIsPlaying } = usePlayer();

  const current = queue[currentTrackIndex];
  const isThisArtist = !!current && tracks.some((t) => t.id === current.id);
  const playing = isThisArtist && isPlaying;

  const handle = () => {
    if (isThisArtist) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (tracks.length) playTrack(tracks, 0);
  };

  return (
    <button
      onClick={handle}
      disabled={tracks.length === 0}
      className="flex items-center gap-2 px-8 py-3 rounded-full text-[15px] font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--accent)", boxShadow: "0 8px 24px var(--accent-glow)" }}
    >
      {playing ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      )}
      {playing ? "Pause" : "Play"}
    </button>
  );
}
