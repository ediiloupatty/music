"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signupAction } from "./actions";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/login?registered=true");
    }
  }, [state, router]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 px-4 font-sans relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-slate-800">
              <Image src="/logo.png" alt="Zenify Logo" width={40} height={40} className="object-cover" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-white hover:text-teal-400 transition-colors">Zenify</h1>
          </Link>
        </div>

        <h2 className="text-xl font-bold mb-6 text-white text-center">Create an Account</h2>

        <form action={formAction} className="flex flex-col gap-4">
          
          {state?.error && (
            <div className="p-3 rounded-md bg-red-500/20 text-red-300 text-sm font-medium">
              {state.error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Display Name</label>
            <input 
              name="name" 
              type="text" 
              placeholder="e.g. John Doe" 
              required
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Username</label>
            <input 
              name="username" 
              type="text" 
              placeholder="e.g. johndoe" 
              required
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Email</label>
            <input 
              name="email" 
              type="email" 
              placeholder="e.g. john@gmail.com" 
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
              minLength={6}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="mt-4 w-full h-12 rounded-lg bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-bold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        
        <p className="mt-6 text-center text-slate-400 text-sm">
          Already have an account? <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
