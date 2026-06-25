"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import NeuronVisualizer from "./NeuronVisualizer";

type ParsedLyric = { time: number; text: string };

function parseLrc(lrcText: string): ParsedLyric[] | null {
  const lines = lrcText.split('\n');
  const parsed: ParsedLyric[] = [];
  // Matches [mm:ss.xx] or [mm:ss.xxx]
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3];
      const ms = parseInt(msStr, 10) * (msStr.length === 2 ? 10 : 1);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        parsed.push({ time, text });
      }
    }
  }

  return parsed.length > 0 ? parsed : null;
}

export default function BottomPlayer() {
  const { 
    tracks, 
    currentTrackIndex, 
    isPlaying, 
    setIsPlaying, 
    playNextTrack, 
    playPrevTrack 
  } = usePlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Minimal visualizer for bottom bar
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentTrack = tracks && tracks.length > 0 ? (tracks[currentTrackIndex] || tracks[0]) : null;

  const [externalLyrics, setExternalLyrics] = useState<string | null>(null);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);

  useEffect(() => {
    // Reset when track changes
    setExternalLyrics(null);
    setIsFetchingLyrics(false);
    
    if (currentTrack) {
      // Check if embedded lyrics have timestamps
      const hasTimestamps = currentTrack.lyrics && /\[\d{2}:\d{2}\.\d{2,3}\]/.test(currentTrack.lyrics);
      
      // If it DOESN'T have timestamps, or there are no lyrics at all, try to fetch from API
      if (!hasTimestamps) {
        const query = `${currentTrack.artist || ''} ${currentTrack.title}`.trim();
        if (query) {
          setIsFetchingLyrics(true);
          fetch(`/api/lyrics?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
              if (data.syncedLyrics) {
                setExternalLyrics(data.syncedLyrics);
              }
            })
            .catch(err => console.error("Failed to fetch synced lyrics", err))
            .finally(() => setIsFetchingLyrics(false));
        }
      }
    }
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.lyrics]);

  const parsedLyrics = useMemo(() => {
    const sourceLyrics = externalLyrics || currentTrack?.lyrics;
    if (!sourceLyrics) return null;
    return parseLrc(sourceLyrics);
  }, [externalLyrics, currentTrack?.lyrics]);

  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics) return -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (progress >= parsedLyrics[i].time) {
        return i;
      }
    }
    return -1;
  }, [progress, parsedLyrics]);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll lyrics
  useEffect(() => {
    if (isExpanded && activeLyricIndex !== -1 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeElement = container.querySelector(`[data-index="${activeLyricIndex}"]`) as HTMLElement;
      if (activeElement) {
        container.scrollTo({
          top: activeElement.offsetTop - container.clientHeight / 2 + activeElement.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [activeLyricIndex, isExpanded]);

  const POMODORO_TIME = 25 * 60;
  const [timeLeft, setTimeLeft] = useState(POMODORO_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const initAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = source;
      
      source.connect(analyser);
      analyser.connect(ctx.destination);
    }
    
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    initAudioContext();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    playNextTrack();
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      initAudioContext();
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Playback failed:", e);
          }
        });
      }
    }
  }, [currentTrackIndex, isPlaying, tracks]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Minimal bar visualizer logic
  useEffect(() => {
    if (isExpanded) return; // Don't run minimal visualizer when expanded
    let animationFrame: number;
    const renderFrame = () => {
      animationFrame = requestAnimationFrame(renderFrame);
      if (!analyserRef.current || !canvasRef.current) return;

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Centered mirrored waveform
        const y = (HEIGHT - barHeight) / 2;
        
        // Color based on position (played vs unplayed part of progress)
        const currentProgressIdx = duration ? (progress / duration) * bufferLength : 0;
        
        if (i < currentProgressIdx) {
           ctx.fillStyle = `rgba(236, 72, 153, ${Math.max(0.4, barHeight / 100)})`; // Pink glow
        } else {
           ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0.1, barHeight / 150)})`; // Slate inactive
        }
        
        ctx.fillRect(x, y, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    renderFrame();
    return () => cancelAnimationFrame(animationFrame);
  }, [isExpanded]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const toggleTimer = (e: React.MouseEvent) => { e.stopPropagation(); setIsTimerRunning(!isTimerRunning); };
  const resetTimer = (e: React.MouseEvent) => { e.stopPropagation(); setIsTimerRunning(false); setTimeLeft(POMODORO_TIME); };

  const rawUrl = currentTrack?.file_url || "";
  const proxyUrl = rawUrl.includes(".r2.dev/")
    ? `/api/audio/${rawUrl.split(".r2.dev/").pop()}`
    : rawUrl;

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={proxyUrl}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        controlsList="nodownload"
      />
      {isExpanded ? (
        <div 
          className="fixed inset-0 h-screen w-screen z-[100] flex flex-col items-center justify-center p-8 bg-[#3B4252]/85 backdrop-blur-3xl overflow-hidden"
          onContextMenu={(e) => e.preventDefault()}
        >
          <NeuronVisualizer analyser={analyserRef.current} />
          
          {/* Top bar with close button */}
        <div className="absolute top-0 w-full p-8 flex justify-between items-center z-10">
          <button 
            onClick={() => setIsExpanded(false)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
          <div className="text-teal-400 font-bold tracking-widest text-sm uppercase">Now Playing</div>
          <div className="w-12"></div> {/* spacer */}
        </div>

        {/* Main expanded content */}
        <div className={`flex flex-col lg:flex-row items-center justify-center w-full ${currentTrack.lyrics ? 'max-w-6xl gap-12 lg:gap-24' : 'max-w-md'} z-10 mt-8 md:mt-12`}>
          
          {/* Left Column: Player Controls */}
          <div className="flex flex-col items-center justify-center w-full max-w-md flex-shrink-0">
            {/* Big Track Icon */}
            <div className={`w-64 h-64 ${currentTrack.lyrics ? 'md:w-72 md:h-72' : 'md:w-80 md:h-80'} rounded-2xl bg-slate-800 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden mb-8 md:mb-12 transition-all`}>
              <img src={currentTrack.cover_url || `https://picsum.photos/seed/${encodeURIComponent(currentTrack.title)}/600/600`} alt={currentTrack.title} className="w-full h-full object-cover text-transparent" />
            </div>
            
            {/* Track Info */}
            <div className="w-full text-center mb-8">
              <h2 className="font-extrabold text-3xl md:text-4xl text-white mb-2 drop-shadow-md flex items-center justify-center gap-3">
                {currentTrack.title}
                {currentTrack.file_url && (currentTrack.file_url.endsWith('.flac') || currentTrack.file_url.endsWith('.wav')) && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-black bg-gradient-to-r from-teal-400 to-indigo-500 text-white tracking-widest border border-white/20 shadow-[0_0_15px_rgba(45,212,191,0.5)]">HI-RES</span>
                )}
              </h2>
              <p className="text-lg text-teal-300 drop-shadow-md">{currentTrack.artist || currentTrack.category}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full flex items-center gap-4 mb-8">
              <span className="text-sm text-slate-300 w-12 text-right font-mono">{formatTime(progress)}</span>
              <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden relative cursor-pointer backdrop-blur-md" 
                   onClick={(e) => {
                     if(audioRef.current && duration) {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const percent = (e.clientX - rect.left) / rect.width;
                       audioRef.current.currentTime = percent * duration;
                     }
                   }}>
                <div
                  className="absolute top-0 left-0 h-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]"
                  style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-sm text-slate-300 w-12 font-mono">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-10 w-full">
              <button onClick={(e) => { e.stopPropagation(); playPrevTrack(); }} className="text-slate-300 hover:text-white transition-colors hover:scale-110">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button
                onClick={togglePlay}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(45,212,191,0.5)] flex-shrink-0"
              >
                {isPlaying ? (
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" className="ml-2"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); playNextTrack(); }} className="text-slate-300 hover:text-white transition-colors hover:scale-110">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </div>
          </div>
          
          {/* Right Column: Lyrics Box (Only if Lyrics exist or fetching) */}
          {(currentTrack.lyrics || externalLyrics || isFetchingLyrics) && (
            <div className="w-full max-w-2xl h-[40vh] lg:h-[70vh] flex flex-col relative"
                 style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
              <div 
                ref={lyricsContainerRef}
                className="w-full h-full overflow-y-auto scrollbar-hide px-2 lg:px-8 py-32 lg:py-64 text-center lg:text-left scroll-smooth">
                <h3 className="text-sm font-black tracking-[0.4em] text-teal-400 uppercase mb-8 lg:mb-12 opacity-80 flex items-center justify-center lg:justify-start gap-3">
                  Lyrics
                  {isFetchingLyrics && <span className="text-xs normal-case tracking-normal opacity-60 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span> Auto-syncing...</span>}
                </h3>
                {parsedLyrics ? (
                  <div className="flex flex-col gap-6 lg:gap-8 transition-all duration-500 pb-32">
                    {parsedLyrics.map((lyric, idx) => {
                      const isActive = activeLyricIndex === idx;
                      const isPassed = activeLyricIndex > idx;
                      return (
                        <div 
                          key={idx}
                          data-index={idx}
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = lyric.time;
                            }
                          }}
                          className={`text-2xl lg:text-[2.5rem] font-extrabold leading-snug lg:leading-tight cursor-pointer transition-all duration-500 origin-center lg:origin-left ${
                            isActive 
                              ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] scale-105' 
                              : isPassed
                                ? 'text-white/40'
                                : 'text-white/20 blur-[1px] hover:blur-none'
                          }`}
                        >
                          {lyric.text}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-2xl lg:text-[2.5rem] font-extrabold leading-snug lg:leading-tight text-white/90 whitespace-pre-wrap transition-all pb-32">
                    {currentTrack.lyrics || "Searching for lyrics..."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          </div>
      ) : (
        <div 
          className="glass-panel fixed bottom-0 left-0 w-full h-auto min-h-[6rem] py-3 md:py-0 md:h-24 border-t-0 border-b-0 border-l-0 border-r-0 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between z-50 gap-4 md:gap-0 cursor-pointer bg-[#3B4252]/90 backdrop-blur-xl transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => setIsExpanded(true)}
        >
          {/* Left: Track Info */}
      <div className="flex items-center gap-3 md:gap-4 w-full md:w-1/4 xl:w-1/5 order-1">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md border border-white/5">
          <img src={currentTrack.cover_url || `https://picsum.photos/seed/${encodeURIComponent(currentTrack.title)}/200/200`} alt={currentTrack.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <div className="font-bold text-white text-sm truncate flex items-center gap-2">
            <span className="truncate">{currentTrack.title}</span>
            {currentTrack.file_url && (currentTrack.file_url.endsWith('.flac') || currentTrack.file_url.endsWith('.wav')) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-gradient-to-r from-teal-400 to-indigo-500 text-white tracking-wider border border-white/20 shadow-[0_0_10px_rgba(45,212,191,0.3)] flex-shrink-0">HI-RES</span>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate">{currentTrack.artist || currentTrack.category}</div>
        </div>
        <div className="ml-auto md:hidden">
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} className="text-slate-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
          </button>
        </div>
      </div>

      {/* Center: Controls + Visualizer + Duration */}
      <div className="flex items-center gap-4 md:gap-6 w-full md:flex-1 order-3 md:order-2 px-0 md:px-8" onClick={e => e.stopPropagation()}>
        
        {/* Play Controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button onClick={playPrevTrack} className="text-slate-400 hover:text-white transition-colors">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(236,72,153,0.4)]"
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button onClick={playNextTrack} className="text-slate-400 hover:text-white transition-colors">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        {/* Visualizer Waveform / Progress */}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <span className="text-xs text-slate-500 font-mono w-10 text-right">{formatTime(progress)}</span>
          
          <div className="h-10 flex-1 relative flex items-center cursor-pointer group"
               onClick={(e) => {
                 if(audioRef.current && duration) {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const percent = (e.clientX - rect.left) / rect.width;
                   audioRef.current.currentTime = percent * duration;
                 }
               }}>
            
            {/* The Visualizer Canvas */}
            <div className="absolute inset-0 w-full h-full flex items-center overflow-hidden pointer-events-none opacity-80">
              <canvas ref={canvasRef} className="w-full h-full" width={1000} height={40} />
            </div>

            {/* Hover overlay for seeking */}
            <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
              </div>
            </div>
            
            {/* Scrubber head indicator */}
            <div 
              className="absolute w-1 h-8 bg-white rounded-full shadow-[0_0_10px_white] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${duration ? (progress / duration) * 100 : 0}% - 2px)` }}
            ></div>

          </div>

          <span className="text-xs text-slate-500 font-mono w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Extra controls */}
      <div className="hidden md:flex items-center justify-end gap-6 w-1/3 order-2 md:order-3 text-slate-400" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <button onClick={toggleTimer} className="hover:text-white transition-colors flex items-center gap-2" title="Toggle Pomodoro Timer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
            <span className={`text-sm font-mono ${isTimerRunning ? "text-teal-400" : ""}`}>
              {formatTime(timeLeft)}
            </span>
          </button>
          <button onClick={resetTimer} className="text-slate-400 hover:text-white transition-colors" title="Reset Timer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 accent-white bg-slate-800 rounded-full appearance-none outline-none"
          />
        </div>
      </div>
        </div>
      )}
    </>
  );
}
