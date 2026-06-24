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
    <div className="w-full max-w-md glass-panel p-8 rounded-2xl">
      <Link href="/" className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-slate-800">
          <Image src="/logo.png" alt="Focus Stream Logo" width={40} height={40} className="object-cover" />
        </div>
        <h1 className="text-2xl font-bold tracking-wide text-white hover:text-teal-400 transition-colors">Focus Stream</h1>
      </Link>

      <h2 className="text-xl font-bold mb-6 text-white text-center">Welcome Back</h2>

      {isRegistered && (
        <div className="p-3 mb-6 rounded-md bg-teal-500/20 text-teal-300 text-sm font-medium text-center">
          Registration successful! Please log in.
        </div>
      )}

      <form
        action={formAction}
        className="flex flex-col gap-4"
      >
        {errorMessage && (
          <div className="p-3 rounded-md bg-red-500/20 text-red-300 text-sm font-medium">
            {errorMessage}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Username or Email</label>
          <input 
            name="username" 
            type="text" 
            placeholder="e.g. johndoe or john@gmail.com" 
            required
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Password</label>
          <input 
            name="password" 
            type="password" 
            placeholder="••••••••" 
            required
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <button 
          type="submit" 
          disabled={isPending}
          className="mt-4 w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-bold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Signing In..." : "Sign In"}
        </button>
      </form>
      <p className="mt-6 text-center text-slate-400 text-sm">
        Don't have an account? <Link href="/signup" className="text-teal-400 hover:text-teal-300 font-medium">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 px-4 font-sans">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
