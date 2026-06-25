"use client";

import useSWR from "swr";
import FavoriteButton from "./FavoriteButton";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MainTracksContainer({
  initialTracks,
  currentCategory,
  userFavorites,
  isLoggedIn,
}: {
  initialTracks: Track[];
  currentCategory: string | null;
  userFavorites: string[];
  isLoggedIn: boolean;
}) {
  const url = currentCategory ? `/api/tracks?category=${encodeURIComponent(currentCategory)}` : null;
  const { playTrack } = usePlayer();
  
  // Use SWR for polling (refresh every 3 seconds). Fallback to initialTracks.
  const { data } = useSWR(url, fetcher, { 
    refreshInterval: 3000,
    fallbackData: { tracks: initialTracks }
  });

  // If no category selected, just render nothing for the tracklist part, 
  // but if tracks somehow exist (they won't if currentCategory is null based on logic), handle it.
  const displayTracks: Track[] = data?.tracks || initialTracks;

  return (
    <>
      {/* Tracklist Preview */}
      <div className="flex flex-col gap-4">
        {displayTracks.length === 0 ? (
          <p className="text-slate-400">No tracks found. Upload some via the Admin panel.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {displayTracks.map((track, idx) => {
              const isFavorited = userFavorites.includes(track.id);
              return (
                <div 
                  key={track.id} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-teal-500/30 hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(45,212,191,0.1)] transition-all cursor-pointer group"
                  onClick={() => playTrack(displayTracks, idx)}
                >
                  {/* Left Side: Icon + Title + Category */}
                  <div className="flex items-center gap-4 w-1/2">
                    <div className="relative w-12 h-12 rounded-lg bg-slate-800 border border-white/10 group-hover:border-teal-500/50 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden transition-colors">
                      <img src={track.cover_url || `https://picsum.photos/seed/${encodeURIComponent(track.title)}/200/200`} alt={track.title} className="w-full h-full object-cover group-hover:opacity-30 transition-opacity duration-300" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-bold text-white text-sm truncate group-hover:text-teal-400 transition-colors">
                        {track.title}
                        {track.file_url && (track.file_url.endsWith('.flac') || track.file_url.endsWith('.wav')) && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-gradient-to-r from-teal-400 to-indigo-500 text-white tracking-wider border border-white/20 shadow-[0_0_10px_rgba(45,212,191,0.3)] align-middle">HI-RES</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400 truncate">{track.artist || track.category}</span>
                    </div>
                  </div>

                  {/* Middle: Duration */}
                  <div className="w-16 text-center">
                    <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">3:40</span>
                  </div>

                  {/* Right Side: Rating + Favorite + Menu */}
                  <div className="flex items-center gap-4 justify-end w-1/4">
                    <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-yellow-500 opacity-50 group-hover:opacity-100 transition-opacity">
                      3 <span className="text-[10px]">★</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <FavoriteButton trackId={track.id} initialIsFavorited={isFavorited} isLoggedIn={isLoggedIn} />
                    </div>
                    <button className="text-slate-600 hover:text-white font-bold tracking-widest pl-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">••</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
