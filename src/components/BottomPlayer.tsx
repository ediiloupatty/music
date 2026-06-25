"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import NeuronVisualizer from "./NeuronVisualizer";

type ParsedLyric = { time: number; text: string };

function parseLrc(lrcText: string): ParsedLyric[] | null {
  const lines = lrcText.split('\n');
  const parsed: ParsedLyric[] = [];
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

// ─── Cover Art Generator (same logic as MainTracksContainer) ───────────────
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

const COVER_PALETTES = [
  { from: "#6366f1", to: "#8b5cf6", mid: "#7c3aed" },
  { from: "#14b8a6", to: "#06b6d4", mid: "#0891b2" },
  { from: "#f43f5e", to: "#ec4899", mid: "#db2777" },
  { from: "#f59e0b", to: "#f97316", mid: "#ea580c" },
  { from: "#10b981", to: "#059669", mid: "#047857" },
  { from: "#3b82f6", to: "#6366f1", mid: "#4f46e5" },
  { from: "#a855f7", to: "#ec4899", mid: "#c026d3" },
  { from: "#06b6d4", to: "#3b82f6", mid: "#2563eb" },
  { from: "#84cc16", to: "#10b981", mid: "#16a34a" },
  { from: "#f97316", to: "#ef4444", mid: "#dc2626" },
];

const MUSIC_ICON_PATHS = [
  "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  "M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z",
  "M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z",
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
];

function LargeCoverArt({ title, category, size = "lg" }: { title: string; category: string; size?: "sm" | "lg" }) {
  const palIdx = hashString(title + category) % COVER_PALETTES.length;
  const iconIdx = hashString(title) % MUSIC_ICON_PATHS.length;
  const palette = COVER_PALETTES[palIdx];
  const iconPath = MUSIC_ICON_PATHS[iconIdx];
  const iconSize = size === "lg" ? 80 : 28;

  return (
    <div
      className="w-full h-full relative flex items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 30% 30%, ${palette.from}, ${palette.mid} 50%, ${palette.to})`,
      }}
    >
      {/* decorative circles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20" style={{ background: palette.from, filter: "blur(30px)" }} />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-15" style={{ background: palette.to, filter: "blur(25px)" }} />
      {/* vinyl ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3/4 h-3/4 rounded-full border border-white/10 opacity-40" />
        <div className="absolute w-1/2 h-1/2 rounded-full border border-white/8 opacity-30" />
      </div>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="white"
        className="relative z-10 drop-shadow-2xl opacity-85"
      >
        <path d={iconPath} />
      </svg>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<"player" | "lyrics">("player");
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentTrack = tracks && tracks.length > 0 ? (tracks[currentTrackIndex] || tracks[0]) : null;

  const [externalLyrics, setExternalLyrics] = useState<string | null>(null);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);

  useEffect(() => {
    setExternalLyrics(null);
    setIsFetchingLyrics(false);
    
    if (currentTrack) {
      const hasTimestamps = currentTrack.lyrics && /\[\d{2}:\d{2}\.\d{2,3}\]/.test(currentTrack.lyrics);
      
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

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  // Minimal bar visualizer logic
  useEffect(() => {
    if (isExpanded) return;
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
        const y = (HEIGHT - barHeight) / 2;
        const currentProgressIdx = duration ? (progress / duration) * bufferLength : 0;
        
        if (i < currentProgressIdx) {
           ctx.fillStyle = `rgba(236, 72, 153, ${Math.max(0.4, barHeight / 100)})`;
        } else {
           ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0.1, barHeight / 150)})`;
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

  const hasLyrics = !!(currentTrack?.lyrics || externalLyrics || isFetchingLyrics);

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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  EXPANDED PLAYER                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isExpanded ? (
        <div 
          className="fixed inset-0 h-screen w-screen z-[100] flex flex-col bg-[#1e2535]/95 backdrop-blur-3xl overflow-hidden"
          onContextMenu={(e) => e.preventDefault()}
        >
          <NeuronVisualizer analyser={analyserRef.current} />

          {/* ── TOP BAR ─────────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
            {/* Close */}
            <button 
              onClick={() => setIsExpanded(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md transition-all active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </button>

            {/* Now Playing label */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black tracking-[0.35em] text-teal-400 uppercase">Now Playing</span>
            </div>

            {/* Playlist / queue icon */}
            <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z"/>
              </svg>
            </button>
          </div>

          {/* ── DESKTOP: side-by-side, MOBILE: tabbed ────────────────────── */}
          <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* ── MOBILE TAB SWITCHER (only when lyrics exist) ─────────── */}
            {hasLyrics && (
              <div className="lg:hidden flex items-center bg-white/5 mx-5 rounded-xl p-1 gap-1 flex-shrink-0 mb-2">
                <button
                  onClick={() => setActiveTab("player")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "player" ? "bg-white/15 text-white" : "text-slate-400"}`}
                >
                  Player
                </button>
                <button
                  onClick={() => setActiveTab("lyrics")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === "lyrics" ? "bg-white/15 text-white" : "text-slate-400"}`}
                >
                  Lyrics
                  {isFetchingLyrics && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />}
                </button>
              </div>
            )}

            {/* ── PLAYER PANEL ─────────────────────────────────────────── */}
            <div className={`flex flex-col items-center lg:flex-1 lg:flex lg:flex-col lg:items-center lg:justify-center px-6 pb-6 overflow-y-auto ${hasLyrics && activeTab === "lyrics" ? "hidden lg:flex" : "flex"}`}>

              {/* Cover Art */}
              <div
                className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex-shrink-0 mt-2 mb-6"
                style={{ boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)` }}
              >
                <LargeCoverArt title={currentTrack.title} category={currentTrack.category} size="lg" />
              </div>

              {/* Track Meta */}
              <div className="w-full text-center mb-5 px-2">
                {/* Category chip */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-slate-500 uppercase">
                    {currentTrack.category}
                  </span>
                  {currentTrack.file_url && (currentTrack.file_url.endsWith('.flac') || currentTrack.file_url.endsWith('.wav')) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-teal-400 to-indigo-500 text-white tracking-widest border border-white/20 shadow-[0_0_12px_rgba(45,212,191,0.4)]">
                      HI-RES
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="font-black text-2xl sm:text-3xl text-white leading-tight mb-1.5 drop-shadow-lg px-4">
                  {currentTrack.title}
                </h2>

                {/* Artist */}
                <p className="text-base text-teal-400 font-semibold drop-shadow-md">
                  {currentTrack.artist || currentTrack.category}
                </p>
              </div>

              {/* ── PROGRESS BAR ─────────────────────────────────────── */}
              <div className="w-full mb-5">
                {/* Slider track */}
                <div
                  className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden relative cursor-pointer group mb-2"
                  onClick={(e) => {
                    if (audioRef.current && duration) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                    }
                  }}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-400 to-teal-300 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.7)] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                  {/* scrubber dot */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
                {/* Times */}
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* ── CONTROLS ─────────────────────────────────────────── */}
              <div className="flex items-center justify-center gap-8 w-full mb-6">
                {/* Prev */}
                <button
                  onClick={(e) => { e.stopPropagation(); playPrevTrack(); }}
                  className="text-slate-300 hover:text-white transition-all active:scale-90 hover:scale-110"
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.5)] hover:shadow-[0_0_45px_rgba(45,212,191,0.7)] hover:scale-105 active:scale-95 transition-all"
                >
                  {isPlaying ? (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="ml-1.5">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={(e) => { e.stopPropagation(); playNextTrack(); }}
                  className="text-slate-300 hover:text-white transition-all active:scale-90 hover:scale-110"
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>

              {/* ── EXTRA CONTROLS ────────────────────────────────────── */}
              <div className="flex items-center justify-between w-full px-2 gap-4">
                {/* Volume */}
                <div className="flex items-center gap-2 text-slate-400" onClick={e => e.stopPropagation()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 accent-teal-400 bg-slate-700 rounded-full appearance-none outline-none cursor-pointer"
                  />
                </div>

                {/* Pomodoro timer */}
                <div className="flex items-center gap-2 text-slate-400" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={toggleTimer}
                    className={`flex items-center gap-1.5 text-xs font-mono transition-colors hover:text-white ${isTimerRunning ? "text-teal-400" : ""}`}
                    title="Toggle Pomodoro Timer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                    </svg>
                    {formatTime(timeLeft)}
                  </button>
                  <button onClick={resetTimer} className="hover:text-white transition-colors" title="Reset Timer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ── LYRICS PANEL ─────────────────────────────────────────── */}
            {hasLyrics && (
              <div className={`lg:flex-1 lg:flex lg:flex-col lg:justify-center overflow-hidden px-6 pb-6 ${activeTab === "player" ? "hidden lg:flex" : "flex flex-col"}`}>
                <div
                  className="w-full flex-1 overflow-hidden"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
                  }}
                >
                  <div
                    ref={lyricsContainerRef}
                    className="h-full overflow-y-auto scrollbar-hide py-32 text-center lg:text-left scroll-smooth px-4 lg:px-8"
                  >
                    <h3 className="text-[10px] font-black tracking-[0.4em] text-teal-400 uppercase mb-8 flex items-center justify-center lg:justify-start gap-2">
                      Lyrics
                      {isFetchingLyrics && (
                        <span className="flex items-center gap-1 text-[9px] normal-case tracking-normal text-slate-400 font-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                          Auto-syncing...
                        </span>
                      )}
                    </h3>

                    {parsedLyrics ? (
                      <div className="flex flex-col gap-5 pb-32">
                        {parsedLyrics.map((lyric, idx) => {
                          const isActive = activeLyricIndex === idx;
                          const isPassed = activeLyricIndex > idx;
                          return (
                            <div
                              key={idx}
                              data-index={idx}
                              onClick={() => {
                                if (audioRef.current) audioRef.current.currentTime = lyric.time;
                              }}
                              className={`origin-center lg:origin-left text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug cursor-pointer transition-all duration-500 ${
                                isActive
                                  ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-105'
                                  : isPassed
                                    ? 'text-white/35 scale-100'
                                    : 'text-white/15 blur-[1px] hover:blur-none hover:text-white/30 scale-100'
                              }`}
                            >
                              {lyric.text}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xl font-extrabold leading-relaxed text-white/80 whitespace-pre-wrap pb-32">
                        {currentTrack.lyrics || "Searching for lyrics..."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ═══════════════════════════════════════════════════════════════════ */
        /*  MINI PLAYER (bottom bar)                                          */
        /* ═══════════════════════════════════════════════════════════════════ */
        <div 
          className="glass-panel fixed bottom-0 left-0 w-full h-auto min-h-[6rem] py-3 md:py-0 md:h-24 border-t-0 border-b-0 border-l-0 border-r-0 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between z-50 gap-4 md:gap-0 cursor-pointer bg-[#3B4252]/90 backdrop-blur-xl transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => setIsExpanded(true)}
        >
          {/* Left: Track Info */}
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-1/4 xl:w-1/5 order-1">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
              <LargeCoverArt title={currentTrack.title} category={currentTrack.category} size="sm" />
            </div>
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/>
                </svg>
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
                       audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                     }
                   }}>
                
                <div className="absolute inset-0 w-full h-full flex items-center overflow-hidden pointer-events-none opacity-80">
                  <canvas ref={canvasRef} className="w-full h-full" width={1000} height={40} />
                </div>

                <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
                
                <div 
                  className="absolute w-1 h-8 bg-white rounded-full shadow-[0_0_10px_white] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progressPercent}% - 2px)` }}
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
