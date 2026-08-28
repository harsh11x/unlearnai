"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans soft-grid">
      <div className="w-full max-w-md space-y-6">
        
        <Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>

        <div className="soft-card p-8 bg-white space-y-6 shadow-xl shadow-slate-200/50">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              N
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Reset Your Password</h1>
            <p className="text-xs text-slate-500">Enter your email and we will send you password reset instructions.</p>
          </div>

          {sent ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 size={16} /> RESET LINK DISPATCHED
              </div>
              <p className="text-xs">Check <strong>{email}</strong> for password recovery link.</p>
            </div>
          ) : (
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

              <button type="submit" className="soft-btn-primary w-full py-3.5 text-xs">
                Send Recovery Instructions →
              </button>
            </form>
          )}
        </div>

      </div>
    </main>
  );
}
