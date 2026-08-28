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
    <div className="min-h-screen flex bg-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-bg-alt relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-highlight/[0.05] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/[0.03] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        <div className="absolute inset-0 grid-bg-dense" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-highlight to-amber-600 flex items-center justify-center">
              <span className="font-mono font-bold text-sm text-[#0a0f1a]">N</span>
            </div>
            <span className="font-sans font-bold text-lg text-ink tracking-tight">
              Null<span className="text-highlight">Mind</span>
            </span>
          </Link>

          <div>
            <h1 className="text-[clamp(2.5rem,4vw,4rem)] font-bold leading-[1.1] tracking-tight text-ink mb-5">
              Welcome
              <br />
              <span className="text-highlight">Back</span>
            </h1>
            <p className="text-ink-muted text-lg max-w-md leading-relaxed">
              Continue your unlearning experiments.
              <br />
              Pick up where you left off.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-ink-subtle font-mono">
            <span>Platform v1.0</span>
            <span className="w-1 h-1 rounded-full bg-ink-subtle" />
            <span>ML Pipeline Active</span>
            <span className="w-1 h-1 rounded-full bg-ink-subtle" />
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-highlight to-amber-600 flex items-center justify-center">
              <span className="font-mono font-bold text-sm text-[#0a0f1a]">N</span>
            </div>
            <span className="font-sans font-bold text-lg text-ink tracking-tight">
              Null<span className="text-highlight">Mind</span>
            </span>
          </Link>

          <h2 className="text-3xl font-bold tracking-tight text-ink mb-2">
            Log In
          </h2>
          <p className="text-ink-muted mb-6">
            Enter your credentials or use a provider.
          </p>

          <div className="text-xs font-mono text-success bg-success/5 border border-success/20 rounded-xl p-3 mb-6">
            Demo: demo@nullmind.dev / Password1
          </div>

          <OAuthButtons mode="login" onError={setError} />

          {error && (
            <div className="flex items-center gap-2 text-sm text-error mt-4 p-3 rounded-xl bg-error/5 border border-error/20">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-ink-subtle block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                className="w-full bg-bg-alt border border-border-strong rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-highlight/50 focus:ring-1 focus:ring-highlight/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-ink-subtle block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  className="w-full bg-bg-alt border border-border-strong rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-highlight/50 focus:ring-1 focus:ring-highlight/20 transition-all pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="btn-primary w-full justify-center py-3.5 mt-2 disabled:opacity-50"
            >
              {loading || authLoading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  Log In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-highlight hover:text-highlight-hover transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
