"use client";

import { useState, useRef, useEffect } from "react";
import { Track } from "@/lib/cloudflare";
import { usePlayer } from "@/context/PlayerContext";
import NeuronVisualizer from "./NeuronVisualizer";

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
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.error("Playback failed:", e));
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

  if (isExpanded) {
    return (
      <div 
        className="fixed inset-0 h-screen w-screen z-[100] flex flex-col items-center justify-center p-8 bg-slate-950 overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
        <NeuronVisualizer analyser={analyserRef.current} />
        
        <audio
          ref={audioRef}
          src={proxyUrl}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          controlsList="nodownload"
        />

        {/* Top bar with close button */}
        <div className="absolute top-0 w-full p-8 flex justify-between items-center z-10">
          <button 
            onClick={() => setIsExpanded(false)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md transition-colors"
          >
            <span className="text-xl">⏷</span>
          </button>
          <div className="text-teal-400 font-bold tracking-widest text-sm uppercase">Now Playing</div>
          <div className="w-12"></div> {/* spacer */}
        </div>

        {/* Main expanded content */}
        <div className="flex flex-col items-center justify-center w-full max-w-md z-10 mt-12">
          {/* Big Track Icon */}
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-gradient-to-br from-indigo-500/80 to-purple-600/80 border border-slate-700/50 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex items-center justify-center backdrop-blur-xl mb-12">
            <span className="text-8xl md:text-9xl">🎵</span>
          </div>
          
          {/* Track Info */}
          <div className="w-full text-center mb-8">
            <h2 className="font-extrabold text-3xl md:text-4xl text-white mb-2 drop-shadow-md">{currentTrack.title}</h2>
            <p className="text-lg text-teal-300 drop-shadow-md">{currentTrack.category}</p>
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
          <div className="flex items-center justify-center gap-8 w-full">
            <button onClick={(e) => { e.stopPropagation(); playPrevTrack(); }} className="text-4xl text-slate-300 hover:text-white transition-colors">⏮</button>
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-teal-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(45,212,191,0.4)]"
            >
              <span className="text-3xl ml-1">{isPlaying ? "⏸" : "▶"}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); playNextTrack(); }} className="text-4xl text-slate-300 hover:text-white transition-colors">⏭</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal Bar Mode ---
  return (
    <div 
      className="glass-panel fixed bottom-0 left-0 w-full h-auto min-h-[6rem] py-3 md:py-0 md:h-24 border-t-0 border-b-0 border-l-0 border-r-0 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between z-50 gap-4 md:gap-0 cursor-pointer bg-[#0a0a0c]/90 backdrop-blur-xl transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => setIsExpanded(true)}
    >
      <audio
        ref={audioRef}
        src={proxyUrl}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        controlsList="nodownload"
      />

      {/* Left: Track Info */}
      <div className="flex items-center gap-3 md:gap-4 w-full md:w-1/4 xl:w-1/5 order-1">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
          <span className="text-xl md:text-2xl">🎵</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <div className="font-bold text-white text-sm truncate">{currentTrack.title}</div>
          <div className="text-xs text-slate-400 truncate">{currentTrack.category}</div>
        </div>
        <div className="ml-auto md:hidden">
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} className="text-slate-400">⏶</button>
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
            <span>⏱</span>
            <span className={`text-sm font-mono ${isTimerRunning ? "text-teal-400" : ""}`}>
              {formatTime(timeLeft)}
            </span>
          </button>
          <button onClick={resetTimer} className="text-xs hover:text-white" title="Reset Timer">↺</button>
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
