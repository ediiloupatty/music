import Link from "next/link";
import { auth } from "@/auth";
import ZenifyGlyph from "@/components/ZenifyGlyph";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen font-sans bg-[#0a0c11] text-slate-100 overflow-x-hidden selection:bg-slate-700 selection:text-white">
      {/* ─── NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full px-6 md:px-12 py-5 border-b border-white/10 bg-[#0a0c11] backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#0a0c11]">
              <ZenifyGlyph size={18} />
            </div>
            <span className="font-black text-xl tracking-tight text-white">
              Zenify
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Keunggulan</a>
            <a href="#download" className="hover:text-white transition-colors">Download App</a>
            <Link href="/player" className="hover:text-white transition-colors">Web Player</Link>
            <a href="https://github.com/ediiloupatty/Zenify" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </nav>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/player"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm bg-white text-slate-950 hover:bg-slate-200 transition-colors"
              >
                <span>Buka Web Player</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link href="/login" className="font-bold text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
                  Sign In
                </Link>
                <Link
                  href="/player"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm bg-white text-slate-950 hover:bg-slate-200 transition-colors"
                >
                  <span>Buka Web Player</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ──────────────────────────────────────── */}
      <section className="py-20 md:py-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 mb-8">
          Masa Depan Pemutar Musik Audiofil
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight max-w-5xl text-white mb-8">
          Musik untuk Jiwa. <br />
          Dirancang Sempurna.
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-3xl leading-relaxed mb-12 font-medium">
          Dengarkan musik favoritmu dalam resolusi tinggi tanpa kompromi. Menggabungkan penyimpanan awan instan, lirik tersinkronisasi mulus, pencarian cerdas AI, dan pengalaman visual yang bersih.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/player"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-full font-extrabold text-lg bg-white text-slate-950 hover:bg-slate-200 transition-colors"
          >
            <span>Buka Web Player</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <a
            href="#download"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-full font-extrabold text-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.62 1.24A2 2 0 004.41 19h15.18a2 2 0 001.79-.76L22 17" />
            </svg>
            <span>Download Aplikasi</span>
          </a>
        </div>

        {/* Feature badges preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mt-20 text-center border-t border-white/10 pt-16 w-full max-w-6xl">
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl md:text-4xl font-black text-white">24-bit</span>
            <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">Hi-Res Lossless Audio</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl md:text-4xl font-black text-white">0%</span>
            <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">Background CPU Idle</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl md:text-4xl font-black text-white">60 FPS</span>
            <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">Visualizer Premium</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl md:text-4xl font-black text-white">100%</span>
            <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">Zero-Latency Lyrics</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION (Bento Grid) ──────────────────────── */}
      <section id="features" className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">
            Dirancang Spesifik untuk <br />
            Pengalaman Mendengarkan Terbaik
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
            Setiap komponen dalam Zenify dioptimalkan secara mendalam demi kenyamanan, kualitas suara tertinggi, dan performa seketika.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Bento Card 1 */}
          <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-8">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Lirik Apple Music Style 100% Singkron</h3>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed font-medium">
                Dilengkapi dengan engine sinkronisasi tingkat kata (per-word sweep) berbasis requestAnimationFrame (RAF) super mulus. Tidak ada jeda atau keterlambatan lirik saat kamu bernyanyi bersama.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-sm font-semibold text-slate-300">
              <span>Fitur Otomatis di Semua Lagu</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>

          {/* Bento Card 2 */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-8">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Cloud Music & AI Search</h3>
              <p className="text-slate-300 text-base leading-relaxed font-medium">
                Pencarian semantik berteknologi AI (Cloudflare AI) memungkinkan kamu mencari nuansa lagu, mood, atau potongan lirik secara instan.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-sm font-semibold text-slate-300">
              <span>Cloudflare R2 Storage</span>
            </div>
          </div>

          {/* Bento Card 3 */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-8">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart Background Throttling</h3>
              <p className="text-slate-300 text-base leading-relaxed font-medium">
                Animasi visualizer 60 FPS akan berhenti sepenuhnya saat aplikasi di-*minimize* atau latar belakang. Beban CPU/GPU turun ke 0% saat memutar lagu!
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-sm font-semibold text-slate-300">
              <span>Performa Sangat Ringan</span>
            </div>
          </div>

          {/* Bento Card 4 */}
          <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-8">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Integrasi Tingkat Desktop (Discord RPC & Media Session)</h3>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed font-medium">
                Tersambung penuh dengan sistem operasi. Kontrol pemutaran lewat tombol headset, bilah notifikasi, hingga status aktivitas lagu secara langsung di profil Discord kamu lewat Discord Rich Presence.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-sm font-semibold text-slate-300">
              <span>Native OS Integration</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD SECTION ───────────────────────────────────── */}
      <section id="download" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="rounded-[3rem] bg-white/5 border border-white/10 p-8 md:p-20 overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-slate-200 mb-8">
              Aplikasi Desktop Premium
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-8 leading-tight">
              Pengalaman Musik Mendalam <br />
              di Desktop Kamu.
            </h2>

            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-12 font-medium">
              Nikmati Zenify sebagai aplikasi mandiri yang super cepat. Dibangun menggunakan arsitektur mutakhir (Go + Webview) yang menjamin performa tanpa kompromi, kontrol sistem operasi bawaan, dan fitur Discord Rich Presence (RPC) secara otomatis.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a
                href="https://github.com/ediiloupatty/Zenify/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-4 px-12 py-5 rounded-full font-extrabold text-lg bg-white text-slate-950 hover:bg-slate-200 transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.62 1.24A2 2 0 004.41 19h15.18a2 2 0 001.79-.76L22 17" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black tracking-wider text-slate-700 uppercase leading-none mb-1">Download untuk</span>
                  <span className="text-xl font-black leading-none">Windows (64-bit)</span>
                </div>
              </a>

              <Link
                href="/player"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-full font-extrabold text-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors"
              >
                <span>Buka Web Player</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-12 text-sm font-semibold text-slate-400 border-t border-white/10 pt-8">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Instalasi Bersih & Ringan</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Update Otomatis via GitHub</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#0a0c11] py-12 px-6 md:px-12 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0a0c11]">
              <ZenifyGlyph size={16} />
            </div>
            <span className="font-bold text-white">Zenify Music Platform</span>
          </div>

          <p className="text-center md:text-left font-medium">
            © {new Date().getFullYear()} Zenify. Built for audiophiles. Music for the soul.
          </p>

          <div className="flex items-center gap-6 font-semibold">
            <a href="https://github.com/ediiloupatty/Zenify" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub Repository</a>
            <Link href="/player" className="hover:text-white transition-colors">Web Player</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
