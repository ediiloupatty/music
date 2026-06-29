import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen font-sans bg-[#1d2230] text-slate-100 selection:bg-[#14b8a6] selection:text-white flex flex-col relative overflow-hidden">
      
      {/* ─── BACKGROUND IMAGE WITH BLUR EFFECT ────────────────── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden">
        <Image
          src="/background.webp"
          alt="Zenify Background"
          fill
          priority
          quality={85}
          className="object-cover object-center opacity-40 filter blur-[25px] scale-110 transform"
        />
        {/* Subtle overlay gradient to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1d2230]/75 via-[#1d2230]/60 to-[#171a26]/95" />
      </div>

      {/* ─── NAVBAR (Fixed & Bulletproof) ──────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full px-8 md:px-16 py-6 bg-[#1d2230]/85 backdrop-blur-md border-b border-slate-800/80 transition-all">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#14b8a6] transition-transform group-hover:scale-110">
              <path d="M12 2L12 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M6 7L6 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M18 7L18 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M3 10L3 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M21 10L21 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-xl tracking-wide text-white">
              Zenify
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-400">
            <a href="#about" className="hover:text-white transition-colors">about</a>
            <a href="#features" className="hover:text-white transition-colors">features</a>
            <a href="#download" className="text-white border-b-2 border-[#14b8a6] pb-1 font-semibold">download</a>
            <a href="https://github.com/ediiloupatty/Zenify" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">github</a>
            <Link href="/player" className="hover:text-white transition-colors font-semibold text-[#14b8a6]">open player</Link>
          </nav>

          <div className="flex md:hidden items-center">
            <Link href="/player" className="text-sm font-bold text-[#14b8a6] hover:underline">
              Open Player
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ──────────────────────────────────────── */}
      <section id="about" className="relative z-10 flex-1 px-8 md:px-16 pt-36 pb-24 max-w-[1400px] mx-auto w-full flex flex-col items-start justify-center text-left">
        <p className="text-sm font-semibold text-slate-400 mb-6 tracking-wide uppercase">
          A minimal music player for Windows
        </p>

        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-tight leading-none text-white mb-2">
          MUSIC,
        </h1>
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-tight leading-none text-[#14b8a6] mb-10">
          REIMAGINED.
        </h1>

        {/* Clean horizontal line */}
        <div className="w-16 h-[2px] bg-slate-500/60 mb-10" />

        <p className="text-xl text-slate-300 leading-relaxed mb-12 font-normal max-w-2xl">
          Zenify is a lightweight desktop music player that helps you organize, play, and enjoy your music beautifully.
        </p>

        <div id="download">
          <a
            href="https://github.com/ediiloupatty/Zenify/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 px-10 py-5 bg-transparent border-2 border-[#14b8a6] text-[#14b8a6] hover:bg-[#14b8a6] hover:text-[#1d2230] transition-all font-bold tracking-wider text-base shadow-[0_0_30px_rgba(20,184,166,0.25)] group"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="transition-colors">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </svg>
            <span>DOWNLOAD FOR WINDOWS</span>
          </a>
        </div>

        <div className="mt-8 flex items-center gap-4 text-sm text-slate-400 font-medium">
          <span>Windows 10 or later</span>
          <span>•</span>
          <span>Free to use</span>
          <span>•</span>
          <Link href="/player" className="hover:text-white transition-colors underline font-semibold text-slate-300">
            Open Web Player
          </Link>
        </div>
      </section>

      {/* ─── DIVIDER ───────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-8 md:px-16 w-full">
        <div className="w-full border-t border-slate-700/50 my-12" />
      </div>

      {/* ─── FEATURES GRID ─────────────────────────────────────── */}
      <section id="features" className="relative z-10 max-w-[1400px] mx-auto px-8 md:px-16 pb-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 w-full">
        <div className="flex flex-col">
          <span className="text-base font-bold text-[#14b8a6] mb-2 font-mono">01</span>
          <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Minimal Design</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-normal">
            Clean and modern interface that stays out of your way.
          </p>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-[#14b8a6] mb-2 font-mono">02</span>
          <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Your Music</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-normal">
            Play your local files with full support for all formats.
          </p>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-[#14b8a6] mb-2 font-mono">03</span>
          <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Smart Library</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-normal">
            Organize automatically. Find anything, instantly.
          </p>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-[#14b8a6] mb-2 font-mono">04</span>
          <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Built for Windows</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-normal">
            Lightweight, fast, and optimized for performance.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-[#171a26]/90 py-10 px-8 md:px-16 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#14b8a6]">
              <path d="M12 2L12 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M6 7L6 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M18 7L18 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-slate-400 font-bold tracking-wide">Zenify</span>
          </div>
          <span>© {new Date().getFullYear()} Zenify. Minimal music player for Windows.</span>
          <div className="flex items-center gap-6 font-semibold">
            <a href="https://github.com/ediiloupatty/Zenify" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <Link href="/player" className="hover:text-white transition-colors">Web Player</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
