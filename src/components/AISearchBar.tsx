"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import { Track } from "@/lib/cloudflare";

type AISearchBarProps = {
  allTracks: Track[];
  onFilteredTracks: (tracks: Track[] | null) => void;
};

// Mood / intent words (ID + EN) that should route a query to the AI even when
// it's short — e.g. "lagu sedih", "musik santai", "happy songs".
const AI_INTENT_PATTERN =
  /\b(lagu|lagu2|musik|music|songs?|playlist|buat|untuk|yang|mirip|kayak|seperti|rekomendasi|recommend|mood|vibe|sedih|galau|patah\s*hati|rindu|kangen|nostalgia|santai|chill|tenang|relax|semangat|energik|enerjik|upbeat|happy|senang|ceria|romantis|romantic|cinta|love|sad|mellow|melow|sendu|fokus|focus|belajar|study|tidur|sleep|workout|olahraga|gym|party|pesta|jalan|nyetir|driving)\b/i;

export default function AISearchBar({ allTracks, onFilteredTracks }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAIMode, setIsAIMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a Fuse index whenever the track list changes. Fuse.js handles fuzzy
  // matching, typo tolerance, and relevance scoring out of the box.
  const fuse = useMemo(
    () =>
      new Fuse(allTracks, {
        keys: [
          { name: "title", weight: 0.5 },
          { name: "artist", weight: 0.3 },
          { name: "genre", weight: 0.1 },
          { name: "category", weight: 0.1 },
        ],
        threshold: 0.4,        // 0 = exact, 1 = match anything
        includeScore: true,
        minMatchCharLength: 2,
        ignoreLocation: true,  // match anywhere in the string
      }),
    [allTracks]
  );

  // Local search: fuzzy filter using Fuse.js (typo tolerant + ranked)
  const localSearch = useCallback(
    (q: string) => {
      const results = fuse.search(q);
      const filtered = results.map((r) => r.item);
      onFilteredTracks(filtered.length > 0 ? filtered : []);
      setAiMessage(null);
      setIsAIMode(false);
    },
    [fuse, onFilteredTracks]
  );

  // AI search: send to /api/ai/search
  const aiSearch = useCallback(
    async (q: string) => {
      // Cancel any previous in-flight AI request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsAILoading(true);
      setIsAIMode(true);
      setAiMessage(null);

      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });

        const data = await res.json();
        const uniqueIds = Array.from(new Set<string>(data.trackIds || []));

        if (uniqueIds.length > 0) {
          const idSet = new Set<string>(uniqueIds);
          // Preserve AI's ordering
          const ordered = uniqueIds
            .map((id: string) => allTracks.find((t) => t.id === id))
            .filter(Boolean) as Track[];
          // Add any remaining local search matches not in the AI list
          const localResults = fuse.search(q).map((r) => r.item);
          const remaining = localResults.filter((t) => !idSet.has(t.id));
          onFilteredTracks([...ordered, ...remaining]);
        } else {
          // Fallback to local search if AI returns empty trackIds
          const localResults = fuse.search(q).map((r) => r.item);
          onFilteredTracks(localResults);
        }

        setAiMessage(data.message || null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("AI search failed:", err);
        setAiMessage("AI sedang tidak tersedia. Menampilkan hasil pencarian biasa.");
        // Fallback to local search
        localSearch(q);
      } finally {
        setIsAILoading(false);
      }
    },
    [allTracks, onFilteredTracks, localSearch, fuse]
  );

  // Handle input change with smart routing
  const handleChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      onFilteredTracks(null); // null = show all
      setAiMessage(null);
      setIsAIMode(false);
      setIsAILoading(false);
      return;
    }

    const trimmed = value.trim();

    // AI mode: triggered by /ai prefix, descriptive queries (>20 chars), or
    // mood/intent keywords — so short queries like "lagu sedih" still hit the AI.
    const isAIQuery =
      trimmed.startsWith("/ai ") ||
      trimmed.length > 20 ||
      AI_INTENT_PATTERN.test(trimmed);

    if (isAIQuery) {
      const aiQuery = trimmed.startsWith("/ai ") ? trimmed.slice(4) : trimmed;
      // Instant local search while waiting for AI
      localSearch(trimmed);
      // Debounce AI requests (800ms)
      debounceRef.current = setTimeout(() => aiSearch(aiQuery), 800);
    } else {
      // Instant local search
      localSearch(trimmed);
    }
  };

  // Handle Enter key for immediate AI search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = query.trim();
      const aiQuery = trimmed.startsWith("/ai ") ? trimmed.slice(4) : trimmed;
      aiSearch(aiQuery);
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    onFilteredTracks(null);
    setAiMessage(null);
    setIsAIMode(false);
    setIsAILoading(false);
    inputRef.current?.focus();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div className="flex-1 max-w-[480px] relative">
      {/* Search Input */}
      <div
        className="flex items-center gap-2 rounded-full px-4 py-2.5 transition-all"
        style={{
          background: "var(--bg-card)",
          border: isAIMode
            ? "1px solid rgba(99,102,241,0.4)"
            : "1px solid var(--border-subtle)",
          backdropFilter: "blur(12px)",
          boxShadow: isAIMode
            ? "0 0 20px rgba(99,102,241,0.15)"
            : "none",
        }}
      >
        {/* Icon: Search or AI sparkle */}
        {isAILoading ? (
          <span className="ai-sparkle flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="url(#ai-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </span>
        ) : isAIMode ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        )}

        <input
          ref={inputRef}
          type="text"
          placeholder="Search or ask AI... (e.g. 'lagu sedih tentang rindu')"
          className="bg-transparent border-none outline-none text-sm w-full"
          style={{ color: "var(--text-primary)" }}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={handleClear}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        )}

        {/* AI badge */}
        {isAILoading && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <span className="ai-dot w-1.5 h-1.5 rounded-full" style={{ background: "#6366f1", animationDelay: "0ms" }} />
            <span className="ai-dot w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6", animationDelay: "150ms" }} />
            <span className="ai-dot w-1.5 h-1.5 rounded-full" style={{ background: "#a855f7", animationDelay: "300ms" }} />
          </span>
        )}
      </div>

      {/* AI Message Bubble */}
      {aiMessage && (
        <div
          className="absolute left-0 right-0 top-full mt-2 px-4 py-3 rounded-2xl text-sm z-50 ai-message-bubble"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "var(--text-primary)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 16px rgba(99,102,241,0.1)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <span className="flex-shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </span>
            <p className="leading-relaxed flex-1 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {aiMessage}
            </p>
            <button
              onClick={() => setAiMessage(null)}
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
