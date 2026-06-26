"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { setAlbumCoverAction, removeAlbumCoverAction } from "@/app/admin/actions";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Album = {
  name: string;
  trackCount: number;
  artist?: string;
  cover_url?: string;
  source: "embedded" | "uploaded" | "none";
};

const SOURCE_LABEL: Record<Album["source"], { text: string; color: string }> = {
  embedded: { text: "From track", color: "#5eead4" },
  uploaded: { text: "Uploaded", color: "#a5b4fc" },
  none: { text: "No cover", color: "#94a3b8" },
};

export default function AlbumManager() {
  const { data, mutate } = useSWR<{ albums: Album[] }>("/api/albums", fetcher, {
    revalidateOnFocus: false,
  });
  const albums = data?.albums || [];

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFile(album: string, file: File | undefined) {
    if (!file) return;
    setBusy(album);
    setMsg(null);
    const fd = new FormData();
    fd.append("album", album);
    fd.append("file", file);
    const res = await setAlbumCoverAction(fd);
    setBusy(null);
    if (res.success) {
      mutate();
      setMsg(`Cover updated for "${album}".`);
    } else {
      setMsg(res.error || "Failed to upload cover");
    }
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleRemove(album: string) {
    setBusy(album);
    setMsg(null);
    const res = await removeAlbumCoverAction(album);
    setBusy(null);
    if (res.success) {
      mutate();
      setMsg(`Reverted cover for "${album}".`);
    } else {
      setMsg(res.error || "Failed to remove cover");
    }
    setTimeout(() => setMsg(null), 4000);
  }

  if (albums.length === 0) return null;

  return (
    <div
      className="mt-6 rounded-3xl overflow-hidden relative"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #14b8a6, #6366f1)" }} />
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.15)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#5eead4">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div>
              <h2 className="font-black text-white text-lg">Album Covers</h2>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.8)" }}>
                Upload art for albums without embedded cover
              </p>
            </div>
          </div>
          {msg && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(20,184,166,0.12)", color: "#5eead4" }}>
              {msg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map((al) => {
            const src = SOURCE_LABEL[al.source];
            const isBusy = busy === al.name;
            return (
              <div
                key={al.name}
                className="flex flex-col gap-2 p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                  {al.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={al.cover_url} alt={al.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#475569,#1e293b)" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                  {isBusy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-xs text-white truncate">{al.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: src.color }} />
                    <span className="text-[10px]" style={{ color: src.color }}>{src.text}</span>
                    <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>· {al.trackCount}</span>
                  </div>
                </div>

                <input
                  ref={(el) => { fileInputs.current[al.name] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(al.name, e.target.files?.[0])}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => fileInputs.current[al.name]?.click()}
                    disabled={isBusy}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "rgba(20,184,166,0.15)", color: "#5eead4" }}
                  >
                    {al.source === "uploaded" ? "Replace" : "Upload"}
                  </button>
                  {al.source === "uploaded" && (
                    <button
                      onClick={() => handleRemove(al.name)}
                      disabled={isBusy}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: "rgba(244,63,94,0.12)", color: "#fb7185" }}
                      title="Remove uploaded cover"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
