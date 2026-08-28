"use client";

import Link from "next/link";
import { useState } from "react";
import OAuthButtons from "@/components/OAuthButtons";
import { ArrowLeft, Lock, Mail, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans soft-grid">
      <div className="w-full max-w-md space-y-6">
        
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} /> Back to NullMind Home
        </Link>

        <div className="soft-card p-8 bg-white space-y-6 shadow-xl shadow-slate-200/50">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              N
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Sign in to NullMind</h1>
            <p className="text-xs text-slate-500">Access your LLM unlearning dashboard and model checkpoints.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-semibold">Password</label>
                <Link href="/forgot-password" className="text-indigo-600 hover:underline text-[11px] font-semibold">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
              />
            </div>

            <button type="submit" className="soft-btn-primary w-full py-3.5 text-xs mt-2">
              {loading ? "Authenticating..." : "Sign In to Studio Workspace →"}
            </button>
          </form>

          <div className="relative border-t border-slate-200 text-center">
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 relative -top-2.5">OR CONTINUE WITH</span>
          </div>

          <OAuthButtons />

          <div className="text-center text-xs text-slate-500 font-medium">
            Don't have an account?{" "}
            <Link href="/signup" className="text-indigo-600 font-semibold hover:underline">
              Create Free Account
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
