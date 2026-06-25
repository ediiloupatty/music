"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { uploadTrackAction, deleteTrackAction } from "./actions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { data, error, mutate } = useSWR('/api/tracks', fetcher, { refreshInterval: 5000 });
  const tracks = data?.tracks || [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const form = e.currentTarget;
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const files = selectedFiles.length > 0 ? selectedFiles : Array.from(fileInput.files || []);

    if (files.length === 0) return;

    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Format the title automatically from filename
      const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      const formattedTitle = rawName.replace(/\b\w/g, c => c.toUpperCase());

      // Create separate FormData for each file
      const formData = new FormData();
      formData.append("title", formattedTitle);
      formData.append("category", category);
      formData.append("file", file);

      setUploadProgress({ current: i + 1, total: files.length });
      
      const result = await uploadTrackAction(formData);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setUploadProgress({ current: 0, total: 0 });
    setSelectedFiles([]);
    form.reset();
    mutate(); // Refresh the tracklist

    if (failCount === 0) {
      setMessage({ type: "success", text: `Successfully uploaded ${successCount} track(s)!` });
    } else {
      setMessage({ type: "error", text: `Uploaded ${successCount} tracks, but ${failCount} failed.` });
    }
  }

  async function handleDelete(id: string, fileUrl: string) {
    if (!confirm("Are you sure you want to delete this track?")) return;
    setDeletingId(id);
    const result = await deleteTrackAction(id, fileUrl);
    if (result.success) {
      mutate();
    } else {
      alert("Failed to delete track: " + result.error);
    }
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-100 font-sans relative overflow-x-hidden pb-20">
      
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-teal-900/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-[#0d0d12]/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-slate-300">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Admin Dashboard
          </h1>
        </div>
        
        {/* User Info / Stats placeholder */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">System Admin</p>
            <p className="text-xs text-slate-400">Managing Database</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/10 flex items-center justify-center shadow-lg">
            <span className="font-bold text-white text-sm">A</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* UPLOAD PANEL (Left Side, 5 columns) */}
          <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-indigo-500" />
            
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span className="text-teal-400">☁️</span> Upload Tracks
            </h2>
            <p className="text-sm text-slate-400 mb-8">Add new music to your cloud storage.</p>
            
            {message && (
              <div className={`p-4 mb-6 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-teal-500/10 border-teal-500/20 text-teal-300' : 'bg-red-500/10 border-red-500/20 text-red-300'} flex items-start gap-3`}>
                <span className="mt-0.5">{message.type === 'success' ? '✅' : '❌'}</span>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              {/* Category Select */}
              <div className="flex flex-col gap-2">
                <label htmlFor="category" className="text-sm font-semibold text-slate-300 ml-1">Playlist Category</label>
                <div className="relative">
                  <select 
                    id="category" 
                    name="category" 
                    required
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none transition-all cursor-pointer shadow-inner"
                  >
                    <option value="Deep Coding">👨‍💻 Deep Coding</option>
                    <option value="Creative Design">🎨 Creative Design</option>
                    <option value="Routine Tasks">✅ Routine Tasks</option>
                    <option value="Relax & Unwind">☕ Relax & Unwind</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* File Upload (Drag & Drop styling) */}
              <div className="flex flex-col gap-2 mt-2">
                <label htmlFor="file" className="text-sm font-semibold text-slate-300 ml-1">Audio Files (MP3, FLAC, WAV, M4A)</label>
                <div 
                  className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-[#0a0a0c]/50 hover:border-white/20 hover:bg-[#0a0a0c]'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { 
                    e.preventDefault(); 
                    setIsDragging(false); 
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setSelectedFiles(Array.from(e.dataTransfer.files));
                    }
                  }}
                >
                  <input 
                    type="file" 
                    id="file" 
                    name="file" 
                    accept=".mp3,audio/mpeg,.flac,audio/flac,.wav,audio/wav,.m4a,audio/mp4" 
                    multiple
                    required={selectedFiles.length === 0}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  {selectedFiles.length > 0 ? (
                    <div className="flex flex-col items-center justify-center pointer-events-none z-0">
                      <div className="text-teal-400 text-4xl mb-2">🎵</div>
                      <p className="text-white font-bold">{selectedFiles.length} file(s) selected</p>
                      <div className="mt-2 text-xs text-slate-400 max-w-[200px] truncate text-center">
                        {selectedFiles.map(f => f.name).join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pointer-events-none z-0">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:bg-indigo-500/20 group-hover:text-indigo-400 text-slate-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                      </div>
                      <p className="text-white font-medium mb-1">Click to browse or drag & drop</p>
                      <p className="text-xs text-slate-500">Supports multiple High-Res files (FLAC, WAV, MP3)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={uploadProgress.total > 0}
                className="mt-4 w-full h-14 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold tracking-wide hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group"
              >
                {/* Progress Bar Background */}
                {uploadProgress.total > 0 && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-black/20 transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                )}
                
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {uploadProgress.total > 0 
                    ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading {uploadProgress.current} of {uploadProgress.total}...
                      </>
                    )
                    : "Upload to Cloudflare"}
                </span>
              </button>
            </form>
          </div>
          
          {/* TRACKS LIST (Right Side, 7 columns) */}
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-purple-400">🗄️</span> Track Library
                </h2>
                <p className="text-sm text-slate-400 mt-1">Manage and organize your uploaded songs.</p>
              </div>
              <div className="bg-white/5 rounded-full px-4 py-1.5 text-xs font-semibold border border-white/10 text-slate-300">
                {tracks.length} Total Tracks
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-sm flex items-center gap-3">
                <span>⚠️</span> Failed to load tracks from the server.
              </div>
            )}

            {!data && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading your tracks...</p>
              </div>
            )}
            
            {tracks.length === 0 && data ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-white/5 rounded-2xl">
                <div className="text-6xl mb-4 opacity-50">📂</div>
                <h3 className="text-lg font-bold text-white mb-1">Library is Empty</h3>
                <p className="text-sm text-slate-400 max-w-xs">You haven't uploaded any tracks yet. Use the panel on the left to add your first song.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[600px]">
                {tracks.map((track: any) => (
                  <div key={track.id} className="group flex items-center justify-between bg-[#0a0a0c]/80 hover:bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Track Icon/Thumb */}
                      {track.cover_url ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/5 flex-shrink-0">
                          <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-indigo-400 flex-shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                          </svg>
                        </div>
                      )}
                      
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate text-sm flex items-center gap-2">
                          <span className="truncate">{track.title}</span>
                          {track.file_url && (track.file_url.endsWith('.flac') || track.file_url.endsWith('.wav')) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-gradient-to-r from-teal-400 to-indigo-500 text-white tracking-wider border border-white/20 flex-shrink-0">HI-RES</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-300 border border-white/5">
                            {track.artist || track.category}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(track.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(track.id, track.file_url)}
                      disabled={deletingId === track.id}
                      title="Delete Track"
                      className="w-8 h-8 rounded-full bg-red-500/0 hover:bg-red-500/10 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {deletingId === track.id ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
      </main>

    </div>
  );
}
