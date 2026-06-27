"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Track } from "@/lib/cloudflare";

const STORAGE_KEY = "zenify_player";
const HISTORY_LIMIT = 100;

type RepeatMode = "off" | "all" | "one";

// ---------------------------------------------------------------------------
// Playback model
//
// `tracks` always holds the queue in its ORIGINAL order — components read the
// current song as `tracks[currentTrackIndex]`, so that contract must hold.
//
// Ordering is decoupled into `playOrder`: a permutation of indices into
// `tracks`. `position` points into `playOrder`, so the real current track is
// `tracks[playOrder[position]]`. This lets us shuffle without touching the
// queue, toggle shuffle on/off losslessly, and walk a proper history.
//
//   Layer 1 (shuffle engine): each track is visited once per pass before any
//   repeat (no more "random per-step" with accidental repeats), and `history`
//   makes Previous return to the actually-previous track.
//
//   Layer 2 (vibe ordering): the shuffled order isn't uniform random — it's a
//   weighted walk that tends to place tracks of the same genre/category and
//   popular tracks (high play_count) near each other, so the next song "fits",
//   while keeping enough randomness that it still feels shuffled.
// ---------------------------------------------------------------------------

// Relative weights for the vibe walk. Tune freely.
const W_BASE = 1; // every track always has a baseline chance
const W_GENRE = 4; // strong pull toward the same genre
const W_CATEGORY = 3; // pull toward the same category (mood/suasana)
const W_POPULAR = 2; // gentle bias toward songs the user plays a lot

const identityOrder = (length: number): number[] =>
  Array.from({ length }, (_, i) => i);

// Pick one item index by weight (roulette-wheel selection).
function weightedPick(items: number[], weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Build a play order starting at `anchor`, then greedily growing it with a
// weighted-random pick that favours tracks similar to the last placed one.
function buildVibeOrder(tracks: Track[], anchor: number): number[] {
  const n = tracks.length;
  if (n <= 1) return n === 1 ? [0] : [];

  const maxPlays = Math.max(1, ...tracks.map((t) => t.play_count || 0));

  const remaining = new Set<number>();
  for (let i = 0; i < n; i++) if (i !== anchor) remaining.add(i);

  const order = [anchor];
  let last = tracks[anchor];

  while (remaining.size > 0) {
    const candidates = [...remaining];
    const weights = candidates.map((idx) => {
      const t = tracks[idx];
      let w = W_BASE;
      if (last.genre && t.genre && last.genre === t.genre) w += W_GENRE;
      if (last.category && t.category && last.category === t.category) w += W_CATEGORY;
      w += W_POPULAR * ((t.play_count || 0) / maxPlays);
      return w;
    });
    const pick = weightedPick(candidates, weights);
    order.push(pick);
    remaining.delete(pick);
    last = tracks[pick];
  }
  return order;
}

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
  // Upcoming tracks in play order (after the current one). `index` is the index
  // into `tracks`, so a UI can jump straight there via setCurrentTrackIndex.
  upcoming: { track: Track; index: number }[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);

  // The real index into `tracks` of the currently playing song.
  const currentTrackIndex = playOrder[position] ?? 0;

  // Upcoming tracks in the current play order (respects shuffle).
  const upcoming = playOrder
    .slice(position + 1)
    .map((trackIdx) => ({ track: tracks[trackIdx], index: trackIdx }))
    .filter((u) => u.track);

  // Restore the last session on reload so playback stays in sync across pages /
  // refreshes. We also restore `isPlaying`; the BottomPlayer attempts to resume
  // and gracefully falls back to paused if the browser blocks autoplay (so the
  // UI never lies about the real audio state). Playback position is restored by
  // the BottomPlayer from its own saved value. Old saves (pre-playOrder) are
  // handled by rebuilding an identity order and mapping the saved index.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved.tracks) || saved.tracks.length === 0) return;

      const n = saved.tracks.length;
      setTracks(saved.tracks);

      const order =
        Array.isArray(saved.playOrder) && saved.playOrder.length === n
          ? saved.playOrder
          : identityOrder(n);
      setPlayOrder(order);

      let pos = 0;
      if (typeof saved.position === "number") {
        pos = saved.position;
      } else if (typeof saved.currentTrackIndex === "number") {
        // Legacy save: map the old track index into the order.
        const mapped = order.indexOf(saved.currentTrackIndex);
        pos = mapped >= 0 ? mapped : saved.currentTrackIndex;
      }
      setPosition(Math.min(Math.max(0, pos), n - 1));

      if (Array.isArray(saved.history)) setHistory(saved.history);
      if (saved.repeatMode) setRepeatMode(saved.repeatMode);
      if (typeof saved.shuffle === "boolean") setShuffle(saved.shuffle);
      if (typeof saved.isPlaying === "boolean") setIsPlaying(saved.isPlaying);
    } catch {}
  }, []);

  // Persist the queue + play state whenever it changes.
  useEffect(() => {
    try {
      if (tracks.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ tracks, playOrder, position, history, repeatMode, shuffle, isPlaying })
        );
      }
    } catch {}
  }, [tracks, playOrder, position, history, repeatMode, shuffle, isPlaying]);

  const playTrack = (newTracks: Track[], startIndex: number) => {
    setTracks(newTracks);
    if (shuffle) {
      // Vibe order anchors the clicked track first, so position 0 plays it.
      setPlayOrder(buildVibeOrder(newTracks, startIndex));
      setPosition(0);
    } else {
      setPlayOrder(identityOrder(newTracks.length));
      setPosition(startIndex);
    }
    setHistory([]);
    setIsPlaying(true);
  };

  // `auto` = triggered by a track ending (vs the user clicking next). When a
  // track ends with repeat off and we're at the end of the order, playback
  // stops. (Repeat-one is handled in BottomPlayer and never reaches here.)
  const playNextTrack = (auto = false) => {
    if (tracks.length === 0) return;

    const atEnd = position >= playOrder.length - 1;
    if (atEnd) {
      if (auto && repeatMode === "off") {
        setIsPlaying(false);
        return; // stay on the last track, paused
      }
      // Wrap: manual next, or repeat all.
      if (shuffle) {
        // Fresh pass, anchored on the current track so the flow continues; skip
        // index 0 (the track we just played) to avoid an immediate repeat.
        const fresh = buildVibeOrder(tracks, currentTrackIndex);
        setPlayOrder(fresh);
        setPosition(fresh.length > 1 ? 1 : 0);
      } else {
        setPosition(0);
      }
      setHistory((h) => [...h, position].slice(-HISTORY_LIMIT));
      setIsPlaying(true);
      return;
    }

    setHistory((h) => [...h, position].slice(-HISTORY_LIMIT));
    setPosition(position + 1);
    setIsPlaying(true);
  };

  const playPrevTrack = () => {
    if (tracks.length === 0) return;
    if (history.length > 0) {
      // Proper "previous": return to the track we actually came from.
      setPosition(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    } else {
      setPosition((position - 1 + playOrder.length) % playOrder.length);
    }
    setIsPlaying(true);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off"));
  };

  const toggleShuffle = () => {
    const turningOn = !shuffle;
    if (turningOn) {
      // Rebuild around the current track so it keeps playing, then flow on.
      setPlayOrder(buildVibeOrder(tracks, currentTrackIndex));
      setPosition(0);
    } else {
      // Back to natural order, parked on the current track.
      setPlayOrder(identityOrder(tracks.length));
      setPosition(currentTrackIndex);
    }
    setHistory([]);
    setShuffle(turningOn);
  };

  // Kept for API compatibility: callers pass an index into `tracks`; we map it
  // onto the current play order.
  const setCurrentTrackIndex = (index: number) => {
    const pos = playOrder.indexOf(index);
    if (pos < 0) return;
    setHistory((h) => [...h, position].slice(-HISTORY_LIMIT));
    setPosition(pos);
  };

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
        upcoming,
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
