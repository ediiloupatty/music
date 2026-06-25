"use client";

import { useState } from "react";
import { toggleFavoriteAction } from "@/app/actions/favorites";

export default function FavoriteButton({ 
  trackId, 
  initialIsFavorited,
  isLoggedIn 
}: { 
  trackId: string, 
  initialIsFavorited: boolean,
  isLoggedIn: boolean
}) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async () => {
    if (!isLoggedIn) {
      alert("Please sign in to favorite tracks.");
      return;
    }

    setIsPending(true);
    // Optimistic UI update
    setIsFavorited(!isFavorited);
    
    const result = await toggleFavoriteAction(trackId, isFavorited);
    if (!result.success) {
      // Revert if failed
      setIsFavorited(isFavorited);
      alert(result.error);
    }
    setIsPending(false);
  };

  return (
    <button 
      onClick={handleToggle} 
      disabled={isPending}
      className={`p-2 rounded-full transition-colors ${isFavorited ? 'text-red-500' : 'hover:opacity-80'} disabled:opacity-50`}
      style={{ color: isFavorited ? undefined : "var(--text-muted)" }}
      title="Favorite"
    >
      {isFavorited ? "❤️" : <span style={{ filter: "grayscale(100%) brightness(200%) drop-shadow(0 0 1px rgba(0,0,0,0.5))" }}>🤍</span>}
    </button>
  );
}
