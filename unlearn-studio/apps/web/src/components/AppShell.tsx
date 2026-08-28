"use client";

import { useState, createContext, useContext, type ReactNode } from "react";
import AuthProvider from "./AuthProvider";
import AuthModal from "./AuthModal";
import type { UserData } from "@/lib/firebase";

interface AuthModalContextType {
  openAuth: (mode?: "login" | "signup" | "plan" | "profile", plan?: UserData["plan"]) => void;
  closeAuth: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  openAuth: () => {},
  closeAuth: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "plan" | "profile">("login");
  const [authPlan, setAuthPlan] = useState<UserData["plan"] | undefined>();

  const openAuth = (mode: "login" | "signup" | "plan" | "profile" = "login", plan?: UserData["plan"]) => {
    setAuthMode(mode);
    setAuthPlan(plan);
    setAuthOpen(true);
  };

  const closeAuth = () => setAuthOpen(false);

  return (
    <AuthProvider>
      <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
        {children}
        <AuthModal open={authOpen} onClose={closeAuth} initialMode={authMode} initialPlan={authPlan} />
      </AuthModalContext.Provider>
    </AuthProvider>
  );
}
