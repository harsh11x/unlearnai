"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";
import OAuthButtons from "@/components/OAuthButtons";

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(name, email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase", met: /[A-Z]/.test(password) },
  ];

  const isFormValid =
    name.length > 0 && email.length > 0 && passwordChecks.every((c) => c.met);

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-bg-alt relative overflow-hidden">
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
              Start
              <br />
              <span className="text-highlight">Unlearning</span>
            </h1>
            <p className="text-ink-muted text-lg max-w-md leading-relaxed">
              Upload models, explore capabilities,
              <br />
              run experiments, verify results.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Full access to the evaluation engine",
              "Two unlearning methods included",
              "89-probe evaluation suite",
              "Detailed experiment reports",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-ink-subtle text-sm">
                <CheckCircle2 size={15} className="text-success shrink-0" />
                <span>{item}</span>
              </div>
            ))}
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
            Sign Up
          </h2>
          <p className="text-ink-muted mb-6">
            Create your account or use a provider.
          </p>

          <OAuthButtons mode="signup" onError={setError} />

          {error && (
            <div className="flex items-center gap-2 text-sm text-error mt-4 p-3 rounded-xl bg-error/5 border border-error/20">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4 mt-6">
            <div>
              <label className="text-[11px] font-semibold tracking-widest uppercase text-ink-subtle block mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="Your name"
                className="w-full bg-bg-alt border border-border-strong rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-highlight/50 focus:ring-1 focus:ring-highlight/20 transition-all"
                required
              />
            </div>
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
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center gap-2 text-xs font-mono"
                    >
                      <CheckCircle2
                        size={12}
                        className={
                          check.met ? "text-success" : "text-ink-subtle"
                        }
                      />
                      <span
                        className={
                          check.met ? "text-success" : "text-ink-subtle"
                        }
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || authLoading || !isFormValid}
              className="btn-primary w-full justify-center py-3.5 mt-2 disabled:opacity-50"
            >
              {loading || authLoading ? (
                <span className="animate-pulse">Creating account...</span>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-highlight hover:text-highlight-hover transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
