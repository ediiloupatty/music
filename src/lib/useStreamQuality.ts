"use client";

import { useSyncExternalStore, useCallback } from "react";

// Streaming quality picked by the user (Settings → Playback). Stored per-device
// in localStorage; "lossless" streams the original file, "320"/"128" stream the
// pre-transcoded MP3 variants (q320/ / q128/ prefixes in R2) via ?q= on the
// /api/audio route — which falls back to the original if a variant is missing.
export type StreamQuality = "lossless" | "320" | "128";

const STORAGE_KEY = "zenify_stream_quality";
const CHANGE_EVENT = "zenify-quality-change";

function readQuality(): StreamQuality {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "320" || v === "128") return v;
  } catch {}
  return "lossless";
}

function subscribe(onChange: () => void): () => void {
  // Same-tab changes (custom event) + other-tab changes (storage event).
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useStreamQuality(): [StreamQuality, (q: StreamQuality) => void] {
  const quality = useSyncExternalStore(subscribe, readQuality, () => "lossless" as const);

  const setQuality = useCallback((q: StreamQuality) => {
    try {
      if (q === "lossless") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, q);
    } catch {}
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [quality, setQuality];
}

// Append the quality param to an audio URL. Only /api/audio/ URLs understand
// ?q= — local sample files and external URLs are passed through untouched.
export function withQuality(url: string, quality: StreamQuality): string {
  if (!url || quality === "lossless" || !url.startsWith("/api/audio/")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}q=${quality}`;
}
