"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { createPlaylistAction, deletePlaylistAction } from "@/app/actions/playlists";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const GRADIENT_PAIRS: [string, string][] = [
  ["#6366f1", "#8b5cf6"],
  ["#14b8a6", "#06b6d4"],
  ["#f43f5e", "#ec4899"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#059669"],
  ["#3b82f6", "#6366f1"],
  ["#a855f7", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradientFor(name: string): [string, string] {
  return GRADIENT_PAIRS[hashStr(name) % GRADIENT_PAIRS.length];
}

type Playlist = { id: string; name: string; trackCount?: number };

export default function PlaylistSection({
  currentCategory,
  isLoggedIn,
  sidebarMode = false,
}: {
  currentCategory: string | null;
  isLoggedIn: boolean;
  sidebarMode?: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const { data, mutate } = useSWR<{ playlists: Playlist[] }>("/api/playlists", fetcher, {
    revalidateOnFocus: false,
  });

  const playlists: Playlist[] = data?.playlists || [];

  function openModal() {
    setName("");
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setName("");
    setFormError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setFormError("");
    const res = await createPlaylistAction(name.trim());
    setSaving(false);
    if (res.success) {
      closeModal();
      mutate();
    } else {
      setFormError(res.error || "Failed to create playlist");
    }
  }

  async function handleDelete(e: React.MouseEvent, playlist: Playlist) {
    e.stopPropagation();
    setDeletingId(playlist.id);
    const res = await deletePlaylistAction(playlist.id);
    setDeletingId(null);
    if (res.success) {
      if (currentCategory === playlist.name) router.push("/");
      mutate();
    }
  }

  function togglePlaylist(pl: Playlist) {
    if (currentCategory === pl.name) {
      router.push("/");
    } else {
      router.push(`/?category=${encodeURIComponent(pl.name)}`);
    }
  }

  /* ─── SIDEBAR MODE (Spotify-like vertical list) ─── */
  if (sidebarMode) {
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-3 mb-1">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Your Library
          </span>
          {isLoggedIn && (
            <button
              onClick={openModal}
              title="New Playlist"
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Playlist list */}
        <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: "none" }}>
          {playlists.length === 0 ? (
            <div
              className="mx-2 mt-2 flex flex-col gap-1.5 items-center px-3 py-4 rounded-xl border border-dashed text-center"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-30">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span className="text-[11px] leading-snug">
                {isLoggedIn
                  ? "Create your first playlist"
                  : "Sign in to see your library"}
              </span>
            </div>
          ) : (
            playlists.map((pl) => {
              const isActive = currentCategory === pl.name;
              const [c1, c2] = gradientFor(pl.name);
              return (
                <div
                  key={pl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => togglePlaylist(pl)}
                  onKeyDown={(e) => e.key === "Enter" && togglePlaylist(pl)}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all relative"
                  style={{
                    background: isActive ? "var(--bg-card)" : "transparent",
                  }}
                >
                  {/* Gradient icon */}
                  <div
                    className="w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className="font-semibold text-[13px] truncate leading-tight"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      {pl.name}
                    </span>
                    <span className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Playlist
                      {pl.trackCount !== undefined ? ` · ${pl.trackCount} track${pl.trackCount !== 1 ? "s" : ""}` : ""}
                    </span>
                  </div>
                  {/* Active indicator */}
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  {/* Delete on hover */}
                  {isLoggedIn && (
                    <button
                      onClick={(e) => handleDelete(e, pl)}
                      disabled={deletingId === pl.id}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      style={{ color: "var(--text-muted)" }}
                      title="Delete playlist"
                    >
                      {deletingId === pl.id ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="animate-spin">
                          <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Create Playlist Modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={closeModal}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-black text-lg mb-5" style={{ color: "var(--text-primary)" }}>
                New Playlist
              </h3>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Playlist name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    color: "var(--text-primary)",
                  }}
                />
                {formError && <p className="text-xs text-red-400 -mt-2">{formError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: "var(--accent)" }}
                  >
                    {saving ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ─── DEFAULT (grid) MODE ─── */
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
            Playlists
          </h2>
          {isLoggedIn && (
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                color: "var(--text-secondary)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              New Playlist
            </button>
          )}
        </div>

        {playlists.length === 0 ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-40 flex-shrink-0">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className="text-sm">
              {isLoggedIn
                ? 'No playlists yet — click "New Playlist" to create one.'
                : "Sign in to create playlists."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {playlists.map((pl) => {
              const isActive = currentCategory === pl.name;
              const [c1, c2] = gradientFor(pl.name);
              return (
                <div
                  key={pl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => togglePlaylist(pl)}
                  onKeyDown={(e) => e.key === "Enter" && togglePlaylist(pl)}
                  className="group flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all relative cursor-pointer"
                  style={{
                    background: isActive ? "var(--bg-card)" : "var(--bg-secondary)",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`,
                    outline: isActive ? "1px solid var(--accent)" : "none",
                    outlineOffset: "1px",
                  }}
                >
                  {/* Color swatch */}
                  <div
                    className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center shadow"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  {/* Name + count */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className="font-semibold text-xs truncate leading-tight"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      {pl.name}
                    </span>
                    {pl.trackCount !== undefined && (
                      <span className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {pl.trackCount} track{pl.trackCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {/* Delete button — appears on hover */}
                  {isLoggedIn && (
                    <button
                      onClick={(e) => handleDelete(e, pl)}
                      disabled={deletingId === pl.id}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      style={{ color: "var(--text-muted)" }}
                      title="Delete playlist"
                    >
                      {deletingId === pl.id ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="animate-spin">
                          <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-lg mb-5" style={{ color: "var(--text-primary)" }}>
              New Playlist
            </h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Playlist name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                }}
              />
              {formError && <p className="text-xs text-red-400 -mt-2">{formError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--accent)" }}
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
