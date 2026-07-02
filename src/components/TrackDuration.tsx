"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/lib/cloudflare";
import { formatDuration } from "@/lib/utils";
import { saveDurationAction } from "@/app/admin/actions";

// Reusable duration label. Shows the DB duration when present; otherwise it
// lazily reads just the audio file's metadata header (preload="metadata", not
// the whole file), displays the measured length, and backfills it to the DB so
// every later view — and every other list — reads it straight from the row.
// This is why some legacy tracks (uploaded before duration was extracted) had a
// blank time slot in the queue / Recently Added: their row simply had no
// duration yet, and it was only filled in when the track was actually played.

// Page-scoped cache so a track measured in one list is reused instantly by every
// other list, and survives component remounts, without re-fetching.
const measuredCache = new Map<string, number>();

function audioSrcFor(track: Track): string {
  const raw = track.file_url || "";
  return raw.includes(".r2.dev/") ? `/api/audio/${raw.split(".r2.dev/").pop()}` : raw;
}

export default function TrackDuration({
  track,
  className,
  style,
  fallback = "–:–",
}: {
  track: Track;
  className?: string;
  style?: React.CSSProperties;
  fallback?: string;
}) {
  // Only used to re-render this instance once it has measured its own duration;
  // the value itself lives in `measuredCache` so siblings share it.
  const [, bump] = useState(0);

  useEffect(() => {
    // Nothing to do when the DB already has it or another list already measured.
    if (track.duration || measuredCache.has(track.id)) return;

    const src = audioSrcFor(track);
    if (!src) return;

    let cancelled = false;
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.muted = true;

    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      try { audio.load(); } catch {}
    };

    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      if (cancelled) return;
      if (Number.isFinite(d) && d > 0) {
        measuredCache.set(track.id, d);
        bump((n) => n + 1); // async callback — not a synchronous setState-in-effect
        // Persist for next time. Idempotent: the action only writes when the
        // row's duration is still null/0, so concurrent lists can't clobber it.
        saveDurationAction(track.id, d).catch(() => {});
      }
    };
    audio.onerror = cleanup;
    audio.src = src;

    return () => { cancelled = true; cleanup(); };
    // Depend on the identifying fields, not the whole `track` object (whose
    // identity changes every render and would re-run this needlessly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id, track.duration]);

  const secs = track.duration || measuredCache.get(track.id) || 0;
  return <span className={className} style={style}>{formatDuration(secs) || fallback}</span>;
}
