"use client";

import { useState, useEffect } from "react";
import {
  loginWithGoogle,
  loginWithApple,
  loginWithEmail,
  signupWithEmail,
  logout,
  updatePlan,
  type UserData,
} from "@/lib/firebase";
import { useAuth } from "./AuthProvider";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup" | "plan" | "profile";
  initialPlan?: UserData["plan"];
}

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 model/month", "100M params max", "CPU only", "50 steps"],
    highlight: false,
  },
  {
    id: "basic" as const,
    name: "Basic",
    price: "$20",
    period: "/month",
    features: ["5 models/month", "1B params max", "GPU access", "500 steps", "Export"],
    highlight: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$59",
    period: "/month",
    features: ["Unlimited models", "10B params max", "GPU + API", "2K steps", "Priority support"],
    highlight: true,
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$99",
    period: "/month",
    features: ["Everything Pro", "70B params max", "Multi-GPU", "10K steps", "SLA"],
    highlight: false,
  },
];

export default function AuthModal({ open, onClose, initialMode = "login", initialPlan }: AuthModalProps) {
  const { user, userData, refreshUser } = useAuth();
  const [view, setView] = useState<"auth" | "plan" | "profile">("auth");
  const [mode, setMode] = useState<"login" | "signup">(initialMode === "signup" || initialMode === "login" ? initialMode : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<UserData["plan"]>(initialPlan || "free");
  const [signingUp, setSigningUp] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setView("auth");
      setMode(initialMode === "signup" ? "signup" : "login");
      setError("");
      setLoading(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setSelectedPlan(initialPlan || "free");
      setSigningUp(false);
    }
  }, [open, initialMode, initialPlan]);

  // If user is logged in, show profile
  useEffect(() => {
    if (open && user && !signingUp) {
      setView("profile");
    }
  }, [open, user, signingUp]);

  if (!open) return null;

  // ══ PLAN SELECTION VIEW ══
  if (view === "plan") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-bg border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-up" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text text-xl z-10 bg-transparent border-none cursor-pointer">×</button>

          <div className="p-8 text-center border-b border-border">
            <div className="w-10 h-10 bg-accent flex items-center justify-center mx-auto mb-4">
              <span className="text-accent-inv text-sm font-bold font-display">R</span>
            </div>
            <h2 className="font-display font-bold text-2xl">Choose your plan</h2>
            <p className="body-sm mt-1">Start with Free, upgrade anytime</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-6 text-left border-b md:border-r border-border transition-all cursor-pointer bg-transparent ${
                  selectedPlan === plan.id
                    ? plan.highlight ? "bg-accent text-accent-inv" : "bg-surface"
                    : "hover:bg-surface/50"
                } ${plan.highlight && selectedPlan !== plan.id ? "relative" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-highlight" />
                )}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-display font-bold text-lg">{plan.name}</span>
                  <span className="font-display font-bold text-xl">
                    {plan.price}<span className="text-xs opacity-50">{plan.period}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === plan.id ? "border-accent bg-accent" : "border-border-strong"
                  }`}>
                    {selectedPlan === plan.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="text-xs">
                    {selectedPlan === plan.id ? "Selected" : "Select this plan"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs opacity-70">
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="p-6 flex gap-3">
            <button onClick={() => setView("auth")} className="btn-outline text-sm py-2.5 px-5 flex-shrink-0">
              Back
            </button>
            <button
              onClick={async () => {
                if (!user) return;
                setLoading(true);
                try {
                  await updatePlan(user.uid, selectedPlan);
                  await refreshUser();
                  onClose();
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? "Setting up..." : `Start with ${PLANS.find(p => p.id === selectedPlan)?.name}`}
            </button>
          </div>

          {error && <p className="px-6 pb-4 text-xs text-[#ef4444]">{error}</p>}
        </div>
      </div>
    );
  }

  // ══ USER PROFILE VIEW ══
  if (view === "profile" && user) {
    const plan = PLANS.find((p) => p.id === userData?.plan) || PLANS[0];
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-bg border border-border w-full max-w-md animate-fade-up" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text text-xl z-10 bg-transparent border-none cursor-pointer">×</button>

          <div className="p-8 text-center">
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border border-border" />
            )}
            <h2 className="font-display font-bold text-xl">{userData?.displayName || user.displayName || "User"}</h2>
            <p className="body-sm mt-1">{user.email}</p>
          </div>

          {/* Current Plan */}
          <div className="mx-8 p-4 border border-border mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Current Plan</span>
              <span className={`mono text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 ${
                plan.highlight ? "bg-highlight/10 text-highlight border border-highlight/30" : "border border-border text-text-subtle"
              }`}>
                {plan.name}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold">{plan.price}</span>
              <span className="text-xs text-text-subtle">{plan.period}</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Models used</span>
                <span className="mono text-text">{userData?.modelsUsed || 0} / {userData?.modelsLimit || 1}</span>
              </div>
              <div className="w-full h-1.5 bg-surface border border-border">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, ((userData?.modelsUsed || 0) / (userData?.modelsLimit || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Training steps limit</span>
                <span className="mono text-text">{userData?.stepsLimit || 50}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 space-y-2">
            <button
              onClick={() => setView("plan")}
              className="btn-primary w-full text-sm"
            >
              {userData?.plan === "free" ? "Upgrade Plan" : "Change Plan"}
            </button>
            <a href="/downloads" className="btn-outline block text-center no-underline w-full text-sm">
              Download Desktop App
            </a>
            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full py-3 text-sm text-text-subtle hover:text-text transition-colors bg-transparent border-none cursor-pointer font-display"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══ LOGIN / SIGNUP VIEW ══
  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      setSigningUp(false);
      setView("plan");
    } catch (e: any) {
      if (e.code !== "auth/popup-closed-by-user") {
        setError(e.message || "Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithApple();
      setSigningUp(false);
      setView("plan");
    } catch (e: any) {
      if (e.code !== "auth/popup-closed-by-user") {
        setError(e.message || "Apple sign-in failed");
      }
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
        setSigningUp(false);
        setView("plan");
      } else {
        setSigningUp(true);
        const result = await signupWithEmail(email, password, displayName || undefined);
        setView("plan");
      }
    } catch (e: any) {
      const code = e.code || "";
      const errors: Record<string, string> = {
        "auth/user-not-found": "No account found with this email",
        "auth/wrong-password": "Incorrect password",
        "auth/email-already-in-use": "An account already exists with this email",
        "auth/weak-password": "Password must be at least 6 characters",
        "auth/invalid-email": "Invalid email address",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/invalid-credential": "Invalid email or password",
      };
      setError(errors[code] || e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-bg border border-border w-full max-w-md animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-text-subtle hover:text-text text-xl z-10 bg-transparent border-none cursor-pointer">×</button>

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
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border bg-bg hover:bg-surface transition-colors text-sm font-display font-medium text-text cursor-pointer disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button onClick={handleApple} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border bg-bg hover:bg-surface transition-colors text-sm font-display font-medium text-text cursor-pointer disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.98-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
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
          {mode === "signup" && (
            <input type="text" placeholder="Full name" value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full py-3 px-4 border border-border bg-bg text-text text-sm font-body outline-none focus:border-[#525252] transition-colors placeholder:text-text-subtle" />
          )}
          <input type="email" placeholder="Email address" value={email} required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full py-3 px-4 border border-border bg-bg text-text text-sm font-body outline-none focus:border-[#525252] transition-colors placeholder:text-text-subtle" />
          <input type="password" placeholder="Password" value={password} required minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-3 px-4 border border-border bg-bg text-text text-sm font-body outline-none focus:border-[#525252] transition-colors placeholder:text-text-subtle" />

          {error && (
            <p className="text-xs text-[#ef4444] bg-[#450a0a] border border-[#7f1d1d] p-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="btn-primary w-full disabled:opacity-50">
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-xs text-text-subtle pt-2">
            {mode === "login" ? (
              <>Don&apos;t have an account?{" "}
                <button type="button" onClick={() => { setMode("signup"); setError(""); }}
                  className="text-text hover:underline bg-transparent border-none cursor-pointer text-xs font-display">Sign up free</button></>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); }}
                  className="text-text hover:underline bg-transparent border-none cursor-pointer text-xs font-display">Sign in</button></>
            )}
          </p>

          <p className="text-center text-[10px] text-text-subtle pt-1 leading-relaxed">
            By continuing, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>
          </p>
        </form>
      </div>
    </div>
  );
}
