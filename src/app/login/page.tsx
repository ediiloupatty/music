"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "./actions";

function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";

  return (
    <div className="relative w-full max-w-md backdrop-blur-2xl bg-[#1a1f30]/60 border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.65)] rounded-3xl p-8 sm:p-10 z-10 overflow-hidden group">
      {/* Subtle card top glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#14b8a6]/60 to-transparent" />
      
      <Link href="/player" className="flex items-center justify-center gap-3 mb-8 group/logo">
        <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#14b8a6]/20 to-indigo-500/20 border border-white/10 shadow-[0_0_25px_rgba(20,184,166,0.25)] transition-all duration-300 group-hover/logo:scale-105 group-hover/logo:shadow-[0_0_35px_rgba(20,184,166,0.4)]">
          <Image src="/logo.png" alt="Zenify Logo" width={38} height={38} className="object-cover" />
        </div>
        <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover/logo:from-[#14b8a6] group-hover/logo:to-white transition-all duration-300">
          Zenify
        </h1>
      </Link>

      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Welcome Back
        </h2>
        <p className="text-slate-400 text-sm">
          Sign in to continue your sonic journey
        </p>
      </div>

      {isRegistered && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-[#14b8a6]/10 border border-[#14b8a6]/30 text-[#14b8a6] text-sm font-medium shadow-lg backdrop-blur-md animate-bounce-once">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-[#14b8a6]">
            <path d="M12 22C17.5 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.75 12L10.58 14.83L16.25 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Registration successful! Please log in.</span>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium shadow-lg backdrop-blur-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-red-400">
              <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 8V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.995 16H12.005" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 pl-1">
            Username or Email
          </label>
          <div className="relative">
            <input 
              name="username" 
              type="text" 
              placeholder="e.g. johndoe or john@gmail.com" 
              required
              className="w-full bg-[#131723]/80 border border-slate-700/70 rounded-2xl px-4 py-3.5 text-white text-sm outline-none focus:border-[#14b8a6] focus:bg-[#161b29] focus:shadow-[0_0_25px_rgba(20,184,166,0.15)] transition-all duration-300 placeholder:text-slate-600 font-medium"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 pl-1">
            Password
          </label>
          <div className="relative">
            <input 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              required
              className="w-full bg-[#131723]/80 border border-slate-700/70 rounded-2xl px-4 py-3.5 text-white text-sm outline-none focus:border-[#14b8a6] focus:bg-[#161b29] focus:shadow-[0_0_25px_rgba(20,184,166,0.15)] transition-all duration-300 placeholder:text-slate-600 font-medium"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="mt-3 w-full py-4 rounded-2xl bg-gradient-to-r from-[#14b8a6] via-[#0d9488] to-[#6366f1] text-white font-bold tracking-wider hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_15px_35px_rgba(20,184,166,0.35)] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none shadow-xl flex items-center justify-center gap-2 text-sm uppercase"
        >
          {isPending ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin text-white">
                <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill="currentColor" />
              </svg>
              <span>Signing In...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-slate-400 text-sm font-medium">
        Don't have an account?{" "}
        <Link href="/signup" className="text-[#14b8a6] hover:text-[#5eead4] font-bold hover:underline transition-all">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[#12151f] px-4 py-12 font-sans relative overflow-hidden">
      {/* Exquisite background glowing orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none select-none">
        <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[#14b8a6]/15 blur-[160px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-[#6366f1]/15 blur-[150px] pointer-events-none" />
        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(18,21,31,0.8)_100%)] pointer-events-none" />
      </div>

      <Suspense fallback={<div className="text-slate-400 z-10 font-medium">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
