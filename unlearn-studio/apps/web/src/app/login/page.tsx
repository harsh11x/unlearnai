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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brutal-gray border-r-3 border-white flex-col justify-between p-12 grid-bg">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brutal-accent flex items-center justify-center">
            <span className="font-mono text-brutal-black font-bold text-lg">U</span>
          </div>
          <span className="font-display font-bold text-xl">
            UNLEARN<span className="text-brutal-accent">STUDIO</span>
          </span>
        </Link>

        <div>
          <h1 className="font-display font-bold text-4xl leading-tight mb-4">
            Welcome<br />Back
          </h1>
          <p className="text-brutal-mid text-lg">
            Continue your unlearning experiments.
            <br />Pick up where you left off.
          </p>
        </div>

        <div className="font-mono text-xs text-brutal-mid">
          <div>Platform v1.0</div>
          <div>ML Pipeline Active</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-brutal-green rounded-full animate-pulse-glow" />
            <span>System Operational</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="w-10 h-10 bg-brutal-accent flex items-center justify-center">
              <span className="font-mono text-brutal-black font-bold text-lg">U</span>
            </div>
            <span className="font-display font-bold text-xl">
              UNLEARN<span className="text-brutal-accent">STUDIO</span>
            </span>
          </Link>

          <h2 className="font-display font-bold text-3xl mb-2">Log In</h2>
          <p className="text-brutal-mid mb-6">Enter your credentials or use a provider.</p>

          {/* Demo hint */}
          <div className="border border-brutal-green/30 bg-brutal-green/5 p-3 mb-6 text-xs font-mono text-brutal-green">
            Demo: demo@unlearn.studio / Password1
          </div>

          {/* OAuth buttons */}
          <OAuthButtons mode="login" onError={setError} />

          {/* Error */}
          {error && (
            <div className="border border-brutal-accent bg-brutal-accent/10 p-3 mt-6 flex items-center gap-2 text-sm text-brutal-accent">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Email/password form */}
          <form onSubmit={handleLogin} className="space-y-5 mt-6">
            <div>
              <label className="font-mono text-xs text-brutal-mid uppercase tracking-widest block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="w-full bg-brutal-gray border-3 border-white px-4 py-3 font-body text-white placeholder:text-brutal-mid/50 focus:outline-none focus:border-brutal-accent transition-colors"
                required
              />
            </div>

            <div>
              <label className="font-mono text-xs text-brutal-mid uppercase tracking-widest block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full bg-brutal-gray border-3 border-white px-4 py-3 font-body text-white placeholder:text-brutal-mid/50 focus:outline-none focus:border-brutal-accent transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-mid hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full btn-brutal bg-brutal-accent text-brutal-black text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading || authLoading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  Log In <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-brutal-mid text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brutal-accent hover:text-white transition-colors font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
