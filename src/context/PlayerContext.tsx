"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Track } from "@/lib/cloudflare";

type RepeatMode = "off" | "all" | "one";

interface PlayerContextType {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  playTrack: (tracks: Track[], startIndex: number) => void;
  playNextTrack: (auto?: boolean) => void;
  playPrevTrack: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTrackIndex: (index: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);

  const playTrack = (newTracks: Track[], startIndex: number) => {
    setTracks(newTracks);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
  };

  const pickRandomIndex = (length: number, current: number) => {
    if (length <= 1) return current;
    let next = current;
    while (next === current) next = Math.floor(Math.random() * length);
    return next;
  };

  // `auto` = triggered by a track ending (vs the user clicking next). When a
  // track ends with repeat off and we're on the last track, playback stops.
  const playNextTrack = (auto = false) => {
    if (tracks.length === 0) return;

    if (shuffle) {
      setCurrentTrackIndex((prev) => pickRandomIndex(tracks.length, prev));
      setIsPlaying(true);
      return;
    }

    setCurrentTrackIndex((prev) => {
      const next = prev + 1;
      if (next >= tracks.length) {
        // Reached the end
        if (auto && repeatMode === "off") {
          setIsPlaying(false);
          return prev; // stay on last track, paused
        }
        return 0; // wrap (manual next, or repeat all)
      }
      return next;
    });
    if (!(auto && repeatMode === "off" && currentTrackIndex === tracks.length - 1)) {
      setIsPlaying(true);
    }
  };

  const playPrevTrack = () => {
    if (tracks.length === 0) return;
    if (shuffle) {
      setCurrentTrackIndex((prev) => pickRandomIndex(tracks.length, prev));
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    }
    setIsPlaying(true);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off"));
  };

  const toggleShuffle = () => setShuffle((prev) => !prev);

  return (
    <PlayerContext.Provider
      value={{
        tracks,
        currentTrackIndex,
        isPlaying,
        repeatMode,
        shuffle,
        playTrack,
        playNextTrack,
        playPrevTrack,
        setIsPlaying,
        setCurrentTrackIndex,
        toggleRepeat,
        toggleShuffle,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
