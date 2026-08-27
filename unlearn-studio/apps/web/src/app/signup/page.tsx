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
    name.length > 0 &&
    email.length > 0 &&
    passwordChecks.every((c) => c.met);

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brutal-gray border-r-3 border-white flex-col justify-between p-12 grid-bg">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brutal-accent flex items-center justify-center">
            <span className="font-mono text-brutal-black font-bold text-lg">U</span>
          </div>
          <span className="font-display font-bold text-xl">
            NULL<span className="text-brutal-accent">MIND</span>
          </span>
        </Link>

        <div>
          <h1 className="font-display font-bold text-4xl leading-tight mb-4">
            Start<br />Unlearning
          </h1>
          <p className="text-brutal-mid text-lg">
            Upload models, explore capabilities,<br />
            run unlearning experiments, verify results.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Full access to the evaluation engine",
            "Two unlearning methods included",
            "89-probe evaluation suite",
            "Detailed experiment reports",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-brutal-mid text-sm">
              <CheckCircle2 size={14} className="text-brutal-green shrink-0" />
              <span>{item}</span>
            </div>
          ))}
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
              NULL<span className="text-brutal-accent">MIND</span>
            </span>
          </Link>

          <h2 className="font-display font-bold text-3xl mb-2">Sign Up</h2>
          <p className="text-brutal-mid mb-6">Create your account or use a provider.</p>

          {/* OAuth buttons */}
          <OAuthButtons mode="signup" onError={setError} />

          {/* Error */}
          {error && (
            <div className="border border-brutal-accent bg-brutal-accent/10 p-3 mt-6 flex items-center gap-2 text-sm text-brutal-accent">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Email/password form */}
          <form onSubmit={handleSignup} className="space-y-4 mt-6">
            <div>
              <label className="font-mono text-xs text-brutal-mid uppercase tracking-widest block mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="Your name"
                className="w-full bg-brutal-gray border-3 border-white px-4 py-3 font-body text-white placeholder:text-brutal-mid/50 focus:outline-none focus:border-brutal-accent transition-colors"
                required
              />
            </div>

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
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs font-mono">
                      <CheckCircle2
                        size={12}
                        className={check.met ? "text-brutal-green" : "text-brutal-mid/30"}
                      />
                      <span className={check.met ? "text-brutal-green" : "text-brutal-mid/50"}>
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
              className="w-full btn-brutal bg-brutal-accent text-brutal-black text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading || authLoading ? (
                <span className="animate-pulse">Creating account...</span>
              ) : (
                <>
                  Create Account <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-brutal-mid text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-brutal-accent hover:text-white transition-colors font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
