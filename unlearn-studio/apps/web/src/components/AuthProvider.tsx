"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, onAuthStateChanged, getUserData, isFirebaseConfigured, type User, type UserData } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  firebaseReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUser: async () => {},
  firebaseReady: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (u: User | null) => {
    if (!u) {
      setUserData(null);
      return;
    }
    try {
      const data = await getUserData(u.uid);
      setUserData(data);
    } catch (e) {
      console.error("Failed to fetch user data:", e);
    }
  };

  const refreshUser = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  useEffect(() => {
    // If Firebase isn't configured, skip auth entirely
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      await fetchUserData(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUser, firebaseReady: isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}
