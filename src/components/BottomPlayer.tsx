"use client";

import { useState, useRef, useEffect } from "react";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";

export default function BottomPlayer() {
  const { 
    tracks, 
    currentTrackIndex, 
    isPlaying, 
    setIsPlaying, 
    playNextTrack, 
    playPrevTrack 
  } = usePlayer();

  // --- Audio Player State ---
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // --- Visualizer State ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentTrack = tracks && tracks.length > 0 ? (tracks[currentTrackIndex] || tracks[0]) : null;

  // --- Pomodoro State ---
  const POMODORO_TIME = 25 * 60;
  const [timeLeft, setTimeLeft] = useState(POMODORO_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // --- Audio Player Logic ---
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

  const togglePlay = () => {
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

  // Custom onEnded handler to call context's playNextTrack
  const handleEnded = () => {
    playNextTrack();
  };

  // Auto-play when track changes if it was already playing
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      // Small timeout helps ensure audio is loaded before playing
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.error("Playback failed:", e));
      }
    }
  }, [currentTrackIndex, isPlaying, tracks]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // --- Visualizer Logic ---
  useEffect(() => {
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

        ctx.fillStyle = `rgba(45, 212, 191, ${Math.max(0.1, barHeight / 150)})`;
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    renderFrame();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // --- Pomodoro Logic ---
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

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => { setIsTimerRunning(false); setTimeLeft(POMODORO_TIME); };

  // Rewrite Cloudflare public URLs to our local proxy to bypass ISP blocks
  const rawUrl = currentTrack?.file_url || "";
  const proxyUrl = rawUrl.includes(".r2.dev/")
    ? `/api/audio/${rawUrl.split(".r2.dev/").pop()}`
    : rawUrl;

  if (!currentTrack) {
    return null;
  }

  return (
    <div 
      className="glass-panel fixed bottom-0 left-0 w-full h-24 border-t border-b-0 border-l-0 border-r-0 rounded-t-2xl px-6 flex items-center justify-between z-50"
      onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
    >
      
      {/* Visualizer Canvas overlay */}
      <div className="absolute inset-0 w-full h-full -z-10 opacity-30 overflow-hidden rounded-t-2xl pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full" width={1000} height={100} />
      </div>

      <audio
        ref={audioRef}
        src={proxyUrl}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        controlsList="nodownload" // Additional protection for native UI
      />

      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="w-14 h-14 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          <span className="text-2xl">🎵</span>
        </div>
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="font-bold text-white text-sm truncate">{currentTrack.title}</div>
          <div className="text-xs text-slate-400 truncate">{currentTrack.category}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-6">
          <button onClick={playPrevTrack} className="text-slate-400 hover:text-white transition-colors">⏮</button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={playNextTrack} className="text-slate-400 hover:text-white transition-colors">⏭</button>
        </div>
        {/* Progress bar */}
        <div className="w-full max-w-md flex items-center gap-2">
          <span className="text-xs text-slate-500">{formatTime(progress)}</span>
          <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden relative cursor-pointer" 
               onClick={(e) => {
                 if(audioRef.current && duration) {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const percent = (e.clientX - rect.left) / rect.width;
                   audioRef.current.currentTime = percent * duration;
                 }
               }}>
            <div
              className="absolute top-0 left-0 h-full bg-white"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-slate-500">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Extra controls (Timer, Volume) */}
      <div className="flex items-center justify-end gap-6 w-1/3 text-slate-400">
        <div className="flex items-center gap-3">
          <button onClick={toggleTimer} className="hover:text-white transition-colors flex items-center gap-2" title="Toggle Pomodoro Timer">
            <span>⏱</span>
            <span className={`text-sm font-mono ${isTimerRunning ? "text-teal-400" : ""}`}>
              {formatTime(timeLeft)}
            </span>
          </button>
          <button onClick={resetTimer} className="text-xs hover:text-white" title="Reset Timer">
            ↺
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span>🔊</span>
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
  );
}
