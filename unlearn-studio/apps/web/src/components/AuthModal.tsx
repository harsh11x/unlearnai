"use client";

import { useState } from "react";
import {
  loginWithGoogle,
  loginWithApple,
  loginWithEmail,
  signupWithEmail,
  logout,
} from "@/lib/firebase";
import { useAuth } from "./AuthProvider";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ open, onClose, initialMode = "login" }: AuthModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (e: any) {
      setError(e.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithApple();
      onClose();
    } catch (e: any) {
      setError(e.message || "Apple sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
      onClose();
    } catch (e: any) {
      const code = e.code || "";
      if (code === "auth/user-not-found") setError("No account found with this email");
      else if (code === "auth/wrong-password") setError("Incorrect password");
      else if (code === "auth/email-already-in-use") setError("An account already exists with this email");
      else if (code === "auth/weak-password") setError("Password must be at least 6 characters");
      else if (code === "auth/invalid-email") setError("Invalid email address");
      else setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // If user is logged in, show profile
  if (user) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="relative bg-bg border border-border w-full max-w-md p-8 animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text text-lg">
            ×
          </button>

          <div className="text-center mb-6">
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border border-border" />
            )}
            <h2 className="font-display font-bold text-xl">Welcome back</h2>
            <p className="body-sm mt-1">{user.displayName || user.email}</p>
          </div>

          <div className="space-y-3">
            <a href="/pricing" className="btn-primary block text-center no-underline w-full">
              View Plans & Upgrade
            </a>
            <a href="/downloads" className="btn-outline block text-center no-underline w-full">
              Download Desktop App
            </a>
            <button onClick={handleLogout} className="w-full py-3 text-sm text-text-subtle hover:text-text transition-colors bg-transparent border-none cursor-pointer font-display">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-bg border border-border w-full max-w-md animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text text-xl z-10 bg-transparent border-none cursor-pointer">
          ×
        </button>

        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="w-10 h-10 bg-accent flex items-center justify-center mx-auto mb-4">
            <span className="text-accent-inv text-sm font-bold font-display">R</span>
          </div>
          <h2 className="font-display font-bold text-2xl">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="body-sm mt-1">
            {mode === "login"
              ? "Sign in to access your models and unlearning jobs"
              : "Start unlearning — free tier included"}
          </p>
        </div>

        {/* Social logins */}
        <div className="px-8 space-y-3">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border bg-bg hover:bg-surface transition-colors text-sm font-display font-medium text-text cursor-pointer disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <button
            onClick={handleApple}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border bg-bg hover:bg-surface transition-colors text-sm font-display font-medium text-text cursor-pointer disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M14.94 9.46c-.02-2.12 1.72-3.13 1.8-3.19-0.98-1.44-2.5-1.63-3.04-1.66-1.29-.13-2.52.77-3.17.77-.65 0-1.65-.75-2.72-.73-1.4.02-2.69.82-3.41 2.08-1.46 2.54-.37 6.3 1.04 8.36.69 1.02 1.51 2.16 2.59 2.12 1.04-.04 1.43-.68 2.68-.68 1.25 0 1.61.68 2.7.66 1.12-.02 1.83-1.04 2.51-2.07.79-1.18 1.11-2.32 1.13-2.38-.03-.01-2.17-.83-2.19-3.29zM12.62 3.14c.57-.69.96-1.65.85-2.62-.82.03-1.82.55-2.41 1.24-.53.61-.99 1.59-.86 2.53.91.07 1.85-.46 2.42-1.15z"/></svg>
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-subtle font-mono">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="px-8 pb-8 space-y-3">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 px-4 border border-border bg-bg text-text text-sm font-body outline-none focus:border-[#525252] transition-colors placeholder:text-text-subtle"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full py-3 px-4 border border-border bg-bg text-text text-sm font-body outline-none focus:border-[#525252] transition-colors placeholder:text-text-subtle"
            />
          </div>

          {error && (
            <p className="text-xs text-[#ef4444] bg-[#450a0a] border border-[#7f1d1d] p-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-xs text-text-subtle pt-2">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="text-text hover:underline bg-transparent border-none cursor-pointer text-xs font-display">
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-text hover:underline bg-transparent border-none cursor-pointer text-xs font-display">
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-center text-[10px] text-text-subtle pt-2 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="underline">Terms of Service</a> and{" "}
            <a href="#" className="underline">Privacy Policy</a>
          </p>
        </form>
      </div>
    </div>
  );
}
