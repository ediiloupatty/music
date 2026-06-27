"use client";

import { useState } from "react";
import { toggleFavoriteAction } from "@/app/actions/favorites";
import { useToast } from "@/context/ToastContext";

// Reusable favorite toggle rendered as an SVG heart so it matches the rest of
// the UI (the older FavoriteButton uses emoji). Optimistic update with revert on
// failure. Size + className let callers fit it into a hero button, a table row,
// etc. without restyling the heart itself.
export default function HeartButton({
  trackId,
  initialIsFavorited,
  isLoggedIn,
  size = 18,
  className = "",
  stopPropagation = true,
}: {
  trackId: string;
  initialIsFavorited: boolean;
  isLoggedIn: boolean;
  size?: number;
  className?: string;
  stopPropagation?: boolean;
}) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  const handleToggle = async (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    if (!isLoggedIn) {
      showToast("Sign in to save favorites", "error");
      return;
    }

    const prev = isFavorited;
    setIsPending(true);
    setIsFavorited(!prev); // optimistic

    const result = await toggleFavoriteAction(trackId, prev);
    if (result.success) {
      showToast(prev ? "Removed from favorites" : "Added to favorites");
    } else {
      setIsFavorited(prev); // revert
      showToast(result.error || "Couldn't update favorites", "error");
    }
    setIsPending(false);
  };

  const label = isFavorited ? "Remove from favorites" : "Add to favorites";

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={label}
      aria-pressed={isFavorited}
      title={label}
      className={`flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${className}`}
      style={{ color: isFavorited ? "#ef4444" : "var(--text-secondary)" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={isFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}
