"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex bg-[#f7f6f2] font-sans">
      <div className="hidden lg:flex lg:w-[48%] bg-[#09090b] text-white flex-col justify-between p-12 xl:p-16 border-r-2 border-[#09090b]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-white text-[#09090b] border-2 border-white px-3 py-1 font-mono font-black text-lg">
              NULLMIND
            </div>
            <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest">
              // STUDIO v1.0
            </span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
            [ PASSWORD RECOVERY ]
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight uppercase leading-tight font-sans">
            RESET YOUR <br />
            <span className="bg-white text-[#09090b] px-3 py-1 inline-block mt-2">
              ACCOUNT PASSWORD
            </span>
          </h1>
          <p className="font-mono text-xs text-zinc-400 leading-relaxed max-w-md">
            Enter your registered email address to receive a password reset verification link.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span>// NULLMIND SECURITY DISPATCH</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-[#f7f6f2] arch-grid">
        <div className="w-full max-w-[420px] brutalist-card p-8 bg-white">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-[#09090b] text-white border-2 border-[#09090b] px-3 py-1 font-mono font-black text-sm">
              NULLMIND
            </div>
          </Link>

          <div className="brutalist-badge mb-2">RECOVERY GATEWAY</div>
          <h2 className="text-2xl font-extrabold uppercase font-sans tracking-tight mb-1 text-[#09090b]">Forgot Password</h2>
          <p className="font-mono text-xs text-[#52525b] mb-6">Enter your account email to receive reset instructions.</p>

          {sent ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border-2 border-[#09090b] font-mono text-xs text-[#09090b] flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold uppercase">Reset Link Dispatched</div>
                  <div>If an account exists for <span className="font-bold">{email}</span>, password reset instructions have been sent.</div>
                </div>
              </div>
              <Link href="/login" className="brutalist-btn-primary w-full py-3 text-xs justify-center">
                Return to Login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#09090b] block mb-1.5">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#f7f6f2] border-2 border-[#09090b] px-4 py-3 font-mono text-xs text-[#09090b] focus:outline-none focus:bg-white transition-all"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="brutalist-btn-primary w-full py-3.5 mt-2 text-xs">
                {loading ? <span className="animate-pulse">Sending Reset Link...</span> : <>Send Reset Link <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          <p className="mt-8 text-center font-mono text-xs text-[#52525b]">
            Remember your password?{" "}
            <Link href="/login" className="font-extrabold text-[#09090b] hover:underline">Log in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
