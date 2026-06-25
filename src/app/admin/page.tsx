"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { uploadTrackAction, deleteTrackAction } from "./actions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Cover art generator (same palette as MainTracksContainer)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}
const PALETTES = [
  ["#6366f1","#8b5cf6"],["#14b8a6","#06b6d4"],["#f43f5e","#ec4899"],
  ["#f59e0b","#f97316"],["#10b981","#059669"],["#3b82f6","#6366f1"],
  ["#a855f7","#ec4899"],["#06b6d4","#3b82f6"],["#84cc16","#10b981"],["#f97316","#ef4444"],
];
const ICON_PATHS = [
  "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  "M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z",
  "M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z",
  "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z",
];

function TrackMini({ title, category }: { title: string; category: string }) {
  const pal = PALETTES[hashString(title + category) % PALETTES.length];
  const icon = ICON_PATHS[hashString(title) % ICON_PATHS.length];
  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative"
      style={{ background: `linear-gradient(135deg, ${pal[0]}, ${pal[1]})` }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="opacity-90 relative z-10">
        <path d={icon} />
      </svg>
    </div>
  );
}

const CATEGORIES = [
  { value: "Deep Coding",     label: "Deep Coding",     emoji: "👨‍💻" },
  { value: "Creative Design", label: "Creative Design", emoji: "🎨" },
  { value: "Routine Tasks",   label: "Routine Tasks",   emoji: "✅" },
  { value: "Relax & Unwind", label: "Relax & Unwind",  emoji: "☕" },
];

export default function AdminPage() {
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [message, setMessage]               = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragging, setIsDragging]         = useState(false);
  const [selectedFiles, setSelectedFiles]   = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { data, error, mutate } = useSWR("/api/tracks", fetcher, { refreshInterval: 5000 });
  const tracks = data?.tracks || [];

  const isUploading = uploadProgress.total > 0;

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f =>
      /\.(mp3|flac|wav|m4a)$/i.test(f.name)
    );
    if (arr.length) {
      setSelectedFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const newUniqueFiles = arr.filter(f => !existingNames.has(f.name));
        return [...prev, ...newUniqueFiles];
      });
    }
  }

  function removeFile(idx: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFiles.length) return;
    setMessage(null);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    let ok = 0, fail = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      const title = rawName.replace(/\b\w/g, c => c.toUpperCase());
      const fd = new FormData();
      fd.append("title", title);
      fd.append("category", selectedCategory);
      fd.append("file", file);
      setUploadProgress({ current: i + 1, total: selectedFiles.length });
      const res = await uploadTrackAction(fd);
      res.success ? ok++ : fail++;
    }

    setUploadProgress({ current: 0, total: 0 });
    setSelectedFiles([]);
    mutate();

    setMessage(
      fail === 0
        ? { type: "success", text: `${ok} track${ok > 1 ? "s" : ""} uploaded successfully! 🎉` }
        : { type: "error",   text: `Uploaded ${ok} tracks, ${fail} failed.` }
    );
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleDelete(id: string, fileUrl: string) {
    if (!confirm("Delete this track permanently?")) return;
    setDeletingId(id);
    const res = await deleteTrackAction(id, fileUrl);
    if (!res.success) alert("Failed to delete: " + res.error);
    setDeletingId(null);
    mutate();
  }

  const progressPct = isUploading ? (uploadProgress.current / uploadProgress.total) * 100 : 0;

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #0d111c 0%, #111827 60%, #0a0f1a 100%)" }}>

      {/* Ambient glows */}
      <div className="fixed top-0 left-1/3 w-[700px] h-[700px] rounded-full pointer-events-none -z-10"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{ background: "radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 px-6 md:px-10 py-4 flex items-center justify-between"
        style={{ background: "rgba(13,17,28,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-4">
          <Link href="/"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="opacity-70">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.7)" }}>Zenify Cloud Music</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            {tracks.length} Tracks
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            A
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ═══════════════════════════════════════════════════════════════
              UPLOAD PANEL
          ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 rounded-3xl overflow-hidden relative"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(24px)" }}>

            {/* Accent top bar */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #14b8a6, #f43f5e)" }} />

            <div className="p-6 md:p-8">

              {/* Panel header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#a5b4fc">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-black text-white text-lg">Upload Tracks</h2>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>MP3 · FLAC · WAV · M4A</p>
                </div>
              </div>

              {/* Toast message */}
              {message && (
                <div className={`mb-5 p-3.5 rounded-2xl flex items-start gap-3 text-sm font-medium transition-all ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                }`}>
                  <span className="text-base mt-0.5">{message.type === "success" ? "✅" : "❌"}</span>
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {/* ── CATEGORY SELECT ────────────────────────────────── */}
                <div>
                  <label className="block text-xs font-bold tracking-[0.15em] uppercase mb-2"
                    style={{ color: "rgba(148,163,184,0.7)" }}>
                    Playlist Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setSelectedCategory(cat.value)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                        style={{
                          background: selectedCategory === cat.value
                            ? "rgba(99,102,241,0.2)"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${selectedCategory === cat.value ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
                          color: selectedCategory === cat.value ? "#a5b4fc" : "rgba(148,163,184,0.7)",
                        }}
                      >
                        <span className="text-base">{cat.emoji}</span>
                        <span className="leading-tight text-xs">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── DRAG & DROP ZONE ───────────────────────────────── */}
                <div>
                  <label className="block text-xs font-bold tracking-[0.15em] uppercase mb-2"
                    style={{ color: "rgba(148,163,184,0.7)" }}>
                    Audio Files
                  </label>
                  <div
                    className="relative rounded-2xl transition-all duration-200 cursor-pointer"
                    style={{
                      border: `2px dashed ${isDragging ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
                      background: isDragging ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                      minHeight: selectedFiles.length > 0 ? "auto" : "160px",
                    }}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                    onClick={() => selectedFiles.length === 0 && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp3,audio/mpeg,.flac,audio/flac,.wav,audio/wav,.m4a,audio/mp4"
                      multiple
                      className="hidden"
                      onChange={e => e.target.files && handleFiles(e.target.files)}
                    />
                    <input
                      ref={folderInputRef}
                      type="file"
                      accept=".mp3,audio/mpeg,.flac,audio/flac,.wav,audio/wav,.m4a,audio/mp4"
                      // @ts-expect-error React webkitdirectory attribute
                      webkitdirectory=""
                      multiple
                      className="hidden"
                      onChange={e => e.target.files && handleFiles(e.target.files)}
                    />

                    {selectedFiles.length > 0 ? (
                      /* ── File list ── */
                      <div className="p-3 flex flex-col gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{file.name.replace(/\.[^/.]+$/, "")}</p>
                              <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                                {(file.size / (1024 * 1024)).toFixed(1)} MB · {file.name.split(".").pop()?.toUpperCase()}
                              </p>
                            </div>
                            <button type="button" onClick={() => removeFile(idx)}
                              className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                        {/* Add more button */}
                        <div className="flex gap-2">
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ border: "1px dashed rgba(99,102,241,0.4)", color: "#818cf8" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            Add Files
                          </button>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ border: "1px dashed rgba(20,184,166,0.4)", color: "#5eead4" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z"/></svg>
                            Add Folder
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Empty drop zone ── */
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none p-6">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform"
                          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#818cf8">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                          </svg>
                        </div>
                        <div className="text-center mt-2">
                          <p className="font-bold text-white text-sm mb-2">Drop files or folder here</p>
                          <div className="flex items-center justify-center gap-3">
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                              style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                              Browse Files
                            </button>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                              style={{ background: "rgba(20,184,166,0.15)", color: "#5eead4" }}>
                              Browse Folder
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {["MP3","FLAC","WAV","M4A"].map(f => (
                            <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── UPLOAD BUTTON ──────────────────────────────────── */}
                <button
                  type="submit"
                  disabled={isUploading || selectedFiles.length === 0}
                  className="relative w-full h-13 rounded-2xl font-black text-white overflow-hidden transition-all active:scale-[0.98]"
                  style={{
                    background: isUploading || selectedFiles.length === 0
                      ? "rgba(99,102,241,0.3)"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
                    cursor: isUploading || selectedFiles.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: selectedFiles.length > 0 && !isUploading ? "0 8px 24px rgba(99,102,241,0.35)" : "none",
                    padding: "14px",
                  }}
                >
                  {/* Progress fill */}
                  {isUploading && (
                    <div className="absolute inset-0 transition-all duration-500"
                      style={{
                        width: `${progressPct}%`,
                        background: "rgba(255,255,255,0.15)",
                      }} />
                  )}

                  <span className="relative z-10 flex items-center justify-center gap-2.5 text-sm">
                    {isUploading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Uploading {uploadProgress.current} / {uploadProgress.total}
                      </>
                    ) : selectedFiles.length > 0 ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                        Upload {selectedFiles.length} Track{selectedFiles.length > 1 ? "s" : ""}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Select files to upload
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TRACK LIBRARY
          ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 rounded-3xl overflow-hidden relative"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(24px)" }}>

            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #14b8a6, #6366f1)" }} />

            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.25), rgba(99,102,241,0.25))", border: "1px solid rgba(20,184,166,0.3)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5eead4">
                      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-black text-white text-lg">Track Library</h2>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Manage your uploaded music</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)", color: "#5eead4" }}>
                  {tracks.length} tracks
                </div>
              </div>

              {/* Error state */}
              {error && (
                <div className="p-4 rounded-2xl flex items-center gap-3 text-sm mb-4"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#fca5a5" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  Failed to load tracks from server.
                </div>
              )}

              {/* Loading */}
              {!data && !error && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" style={{ color: "#6366f1" }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <p className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>Loading library...</p>
                </div>
              )}

              {/* Empty state */}
              {tracks.length === 0 && data && (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6 rounded-2xl"
                  style={{ border: "2px dashed rgba(255,255,255,0.06)" }}>
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(99,102,241,0.5)">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                  <h3 className="font-black text-white mb-1">Library is empty</h3>
                  <p className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>Upload your first track using the panel on the left.</p>
                </div>
              )}

              {/* Track list */}
              {tracks.length > 0 && (
                <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin" style={{ maxHeight: "560px", paddingRight: "4px" }}>
                  {tracks.map((track: any, idx: number) => (
                    <div
                      key={track.id}
                      className="group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.25)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)";
                      }}
                    >
                      {/* Index number */}
                      <span className="w-5 text-right text-[11px] font-mono flex-shrink-0"
                        style={{ color: "rgba(148,163,184,0.3)" }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      {/* Cover art */}
                      <TrackMini title={track.title} category={track.category} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{track.title}</span>
                          {track.file_url && (track.file_url.endsWith('.flac') || track.file_url.endsWith('.wav')) && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider text-white"
                              style={{ background: "linear-gradient(90deg, #14b8a6, #6366f1)" }}>
                              HI-RES
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {track.artist || "Unknown Artist"}
                          </span>
                          <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.35)" }}>
                            {track.category}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(track.id, track.file_url)}
                        disabled={deletingId === track.id}
                        title="Delete track"
                        className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90 flex-shrink-0"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.15)",
                          color: "#f87171",
                        }}
                      >
                        {deletingId === track.id ? (
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
