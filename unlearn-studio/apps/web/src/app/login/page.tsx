"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";
import OAuthButtons from "@/components/OAuthButtons";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f7f6f2] font-sans">
      {/* Left panel */}
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
            [ AUTHENTICATION GATEWAY ]
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight uppercase leading-tight font-sans">
            LOG IN TO <br />
            <span className="bg-white text-[#09090b] px-3 py-1 inline-block mt-2">
              UNLEARN STUDIO
            </span>
          </h1>
          <p className="font-mono text-xs text-zinc-400 leading-relaxed max-w-md">
            Resume your LLM capability unlearning experiments. Probe baseline performance, run gradient ascent, and verify targeted erasure.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono border-t border-zinc-800 pt-6">
          <span>// PLATFORM: ACTIVE</span>
          <span>·</span>
          <span>PROBE SUITE: 89 TESTS</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-[#f7f6f2] arch-grid">
        <div className="w-full max-w-[420px] brutalist-card p-8 bg-white">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-[#09090b] text-white border-2 border-[#09090b] px-3 py-1 font-mono font-black text-sm">
              NULLMIND
            </div>
          </Link>

          <div className="brutalist-badge mb-2">ACCOUNT LOG IN</div>
          <h2 className="text-2xl font-extrabold uppercase font-sans tracking-tight mb-1 text-[#09090b]">Log In</h2>
          <p className="font-mono text-xs text-[#52525b] mb-6">Enter your credentials or use an OAuth provider.</p>

          <div className="font-mono text-xs font-bold text-[#09090b] bg-[#f7f6f2] border-2 border-[#09090b] p-3 mb-6">
            Demo Credentials: demo@nullmind.dev / Password1
          </div>

          <OAuthButtons mode="login" onError={setError} />

          {error && (
            <div className="flex items-center gap-2 font-mono text-xs text-[#09090b] mt-4 p-3 bg-red-50 border-2 border-[#09090b]">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div>
              <label className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#09090b] block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="w-full bg-[#f7f6f2] border-2 border-[#09090b] px-4 py-3 font-mono text-xs text-[#09090b] focus:outline-none focus:bg-white transition-all"
                required
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#09090b] block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full bg-[#f7f6f2] border-2 border-[#09090b] px-4 py-3 font-mono text-xs text-[#09090b] focus:outline-none focus:bg-white transition-all pr-11"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#09090b]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="brutalist-btn-primary w-full py-3.5 mt-2 text-xs"
            >
              {loading || authLoading ? <span className="animate-pulse">Authenticating...</span> : <>Log In <ArrowRight size={14} /></>}
            </button>
          </form>

          <p className="mt-8 text-center font-mono text-xs text-[#52525b]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-extrabold text-[#09090b] hover:underline">Sign up →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
