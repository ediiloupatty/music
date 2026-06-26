"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { setArtistImageAction, removeArtistImageAction, setArtistBioAction } from "@/app/admin/actions";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Artist = {
  name: string;
  trackCount: number;
  albumCount: number;
  image_url?: string;
  bio?: string;
};

export default function ArtistManager() {
  const { data, mutate } = useSWR<{ artists: Artist[] }>("/api/artists", fetcher, {
    revalidateOnFocus: false,
  });
  const artists = data?.artists || [];

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [bioEditing, setBioEditing] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleFile(artist: string, file: File | undefined) {
    if (!file) return;
    setBusy(artist);
    const fd = new FormData();
    fd.append("artist", artist);
    fd.append("file", file);
    const res = await setArtistImageAction(fd);
    setBusy(null);
    if (res.success) { mutate(); flash(`Photo updated for "${artist}".`); }
    else flash(res.error || "Failed to upload photo");
  }

  async function handleRemove(artist: string) {
    setBusy(artist);
    const res = await removeArtistImageAction(artist);
    setBusy(null);
    if (res.success) { mutate(); flash(`Photo removed for "${artist}".`); }
    else flash(res.error || "Failed to remove photo");
  }

  async function handleSaveBio(artist: string) {
    setBusy(artist);
    const res = await setArtistBioAction(artist, bioDraft);
    setBusy(null);
    setBioEditing(null);
    if (res.success) { mutate(); flash(`Bio saved for "${artist}".`); }
    else flash(res.error || "Failed to save bio");
  }

  if (artists.length === 0) return null;

  return (
    <div
      className="mt-6 rounded-3xl overflow-hidden relative"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #f43f5e)" }} />
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#a5b4fc">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div>
              <h2 className="font-black text-white text-lg">Artists</h2>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.8)" }}>
                Upload artist photos &amp; bios for their profile pages
              </p>
            </div>
          </div>
          {msg && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}>
              {msg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((ar) => {
            const isBusy = busy === ar.name;
            const editing = bioEditing === ar.name;
            return (
              <div
                key={ar.name}
                className="flex flex-col gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {ar.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ar.image_url} alt={ar.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-white">{ar.name.charAt(0).toUpperCase()}</span>
                    )}
                    {isBusy && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">{ar.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.7)" }}>
                      {ar.albumCount} album{ar.albumCount !== 1 ? "s" : ""} · {ar.trackCount} track{ar.trackCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <input
                  ref={(el) => { fileInputs.current[ar.name] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(ar.name, e.target.files?.[0])}
                />

                {editing ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={bioDraft}
                      onChange={(e) => setBioDraft(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Short bio..."
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleSaveBio(ar.name)} disabled={isBusy} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50" style={{ background: "var(--accent)", color: "#fff" }}>
                        Save bio
                      </button>
                      <button onClick={() => setBioEditing(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.9)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {ar.bio && <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "rgba(148,163,184,0.8)" }}>{ar.bio}</p>}
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => fileInputs.current[ar.name]?.click()} disabled={isBusy} className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                        {ar.image_url ? "Replace photo" : "Upload photo"}
                      </button>
                      <button onClick={() => { setBioEditing(ar.name); setBioDraft(ar.bio || ""); }} className="px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.9)" }}>
                        {ar.bio ? "Edit bio" : "Add bio"}
                      </button>
                      {ar.image_url && (
                        <button onClick={() => handleRemove(ar.name)} disabled={isBusy} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50" style={{ background: "rgba(244,63,94,0.12)", color: "#fb7185" }} title="Remove photo">
                          ✕
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
