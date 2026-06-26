"use client";

import Link from "next/link";
import { Track, Playlist } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverColor } from "@/lib/useCoverColor";

export default function PlaylistDetail({
  playlist,
  tracks,
}: {
  playlist: Playlist;
  tracks: Track[];
}) {
  const { playTrack, tracks: playerTracks, currentTrackIndex, isPlaying } = usePlayer();
  
  const currentPlayingId = playerTracks[currentTrackIndex]?.id;
  const firstCoverUrl = tracks.find(t => t.cover_url)?.cover_url;
  const { accent, accentSoft, cc } = useCoverColor(firstCoverUrl);

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="flex flex-col w-full text-white">
      {/* HEADER SECTION */}
      <div 
        className="relative pt-12 pb-8 px-6 md:px-10 rounded-3xl mb-8 flex flex-col md:flex-row gap-6 md:gap-8 items-end shadow-lg overflow-hidden border"
        style={{ 
          background: `linear-gradient(180deg, rgba(${cc.r}, ${cc.g}, ${cc.b}, 0.8) 0%, rgba(${cc.r}, ${cc.g}, ${cc.b}, 0.2) 100%)`,
          borderColor: "rgba(255, 255, 255, 0.05)"
        }}
      >
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 hover:bg-black/40 border border-white/10 transition-colors text-sm font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Edit Playlist
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>
        </div>

        {/* Artwork */}
        <div 
          className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 shadow-2xl rounded-2xl overflow-hidden relative z-10"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          {firstCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstCoverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="white" className="opacity-50">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Info */}
        <div className="flex flex-col z-10 flex-1 relative">
          <span className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: "var(--accent)" }}>Playlist</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 drop-shadow-md">{playlist.name}</h1>
          
          <div className="flex items-center gap-2 text-sm text-white/80 font-medium mb-3">
            <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex items-center justify-center border border-white/20">
               <span className="text-[10px] font-bold">U</span>
            </div>
            <span className="font-bold text-white">{playlist.user_email?.split('@')[0] || "Edi Loupatty"}</span>
            <span className="opacity-50">•</span>
            <span>{tracks.length} tracks</span>
            <span className="opacity-50">•</span>
            <span>{durationStr}</span>
          </div>

          <p className="text-sm text-white/70 mb-6 max-w-xl">
            A collection of my favorite songs. Updated regularly.
          </p>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => playTrack(tracks, 0)}
              className="px-8 py-3 rounded-full flex items-center gap-2 font-black shadow-xl hover:scale-105 active:scale-95 transition-all text-black"
              style={{ background: "var(--accent)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              Play
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/10 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/10 transition-colors">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/10 transition-colors">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>
          </div>
        </div>

        {/* Decorative Waveform visualizer */}
        <div className="absolute right-10 bottom-10 hidden lg:flex items-center gap-1 h-24 opacity-60 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
             <div 
               key={i} 
               className="w-1 rounded-full animate-pulse" 
               style={{ 
                 background: "var(--accent)", 
                 height: `${10 + ((i * 17) % 90)}%`,
                 animationDelay: `${(i * 0.1) % 1}s`,
                 animationDuration: `${0.5 + ((i * 0.3) % 0.5)}s`
               }} 
             />
          ))}
        </div>
      </div>

      {/* TRACK LIST */}
      <div className="w-full">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[50px_1fr_1fr_auto] gap-4 px-4 py-3 mb-2 text-xs font-bold tracking-wider text-white/50 border-b border-white/5">
          <div className="text-center">#</div>
          <div>TITLE</div>
          <div className="hidden md:block">ALBUM</div>
          <div className="w-24 text-right pr-6 flex justify-end">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {tracks.map((track, index) => {
            const isActive = currentPlayingId === track.id;
            
            // Format duration
            const mins = Math.floor((track.duration || 0) / 60);
            const secs = Math.floor((track.duration || 0) % 60);
            const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

            return (
              <div
                key={track.id}
                className={`group grid grid-cols-[40px_1fr_auto] md:grid-cols-[50px_1fr_1fr_auto] gap-4 px-4 py-2.5 items-center rounded-xl transition-all hover:bg-white/5 cursor-pointer relative ${isActive ? 'bg-white/5' : ''}`}
                onClick={() => playTrack(tracks, index)}
              >
                {/* Active Bar indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md" style={{ background: "var(--accent)" }} />
                )}

                {/* Index / Play / Active Icon */}
                <div className="text-center text-sm font-medium text-white/50 w-full flex justify-center">
                  {isActive && isPlaying ? (
                     <div className="flex items-center gap-0.5 h-4">
                       <div className="w-1 h-3 rounded-full animate-bounce" style={{ background: "var(--accent)" }}></div>
                       <div className="w-1 h-4 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "0.1s" }}></div>
                       <div className="w-1 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "0.2s" }}></div>
                     </div>
                  ) : isActive && !isPlaying ? (
                     <span style={{ color: "var(--accent)" }}>{index + 1}</span>
                  ) : (
                    <>
                      <span className="group-hover:hidden">{index + 1}</span>
                      <svg className="hidden group-hover:block" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    </>
                  )}
                </div>

                {/* Title and Thumbnail */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white/10">
                    {track.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-50"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-bold truncate ${isActive ? '' : 'text-white'}`} style={isActive ? { color: "var(--accent)" } : {}}>
                      {track.title}
                    </span>
                    <span className="text-xs text-white/60 truncate">
                      {track.artist || "Unknown Artist"}
                    </span>
                  </div>
                </div>

                {/* Album */}
                <div className="hidden md:block text-sm text-white/60 truncate pr-4">
                  {track.album || "-"}
                </div>

                {/* Duration & Actions */}
                <div className="flex items-center justify-end w-24 gap-3 text-sm text-white/60 pr-2">
                  <span>{track.duration ? durationFormatted : "-:--"}</span>
                  <button 
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    onClick={(e) => { e.stopPropagation(); /* handle like */ }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hover:fill-current hover:text-red-500"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  </button>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
