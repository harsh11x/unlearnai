"use client";

import { useState, createContext, useContext, type ReactNode } from "react";
import AuthProvider from "./AuthProvider";
import AuthModal from "./AuthModal";

interface AuthModalContextType {
  openAuth: (mode?: "login" | "signup") => void;
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
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const openAuth = (mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const closeAuth = () => setAuthOpen(false);

  return (
    <AuthProvider>
      <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
        {children}
        <AuthModal open={authOpen} onClose={closeAuth} initialMode={authMode} />
      </AuthModalContext.Provider>
    </AuthProvider>
  );
}
