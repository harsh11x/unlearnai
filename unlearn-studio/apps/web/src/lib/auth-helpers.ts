"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Hook providing convenient auth methods backed by Firebase.
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  /**
   * Register with email/password via Firebase.
   * Tries server-side first (Firebase Admin), falls back to client-side.
   */
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      try {
        // Try server-side registration first (validates with Firebase Admin)
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          // Server-side registration succeeded — now sign in with Firebase client
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          await updateProfile(userCredential.user, { displayName: name });

          await signIn("firebase", {
            idToken: await userCredential.user.getIdToken(),
            redirect: false,
          });

          router.push("/dashboard");
          router.refresh();
          return {};
        }

        // If server returned 503 (Firebase Admin not configured), use client-side
        if (res.status === 503) {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          await updateProfile(userCredential.user, { displayName: name });

          await signIn("firebase", {
            idToken: await userCredential.user.getIdToken(),
            redirect: false,
          });

          router.push("/dashboard");
          router.refresh();
          return {};
        }

        return { error: data.error || "Registration failed." };
      } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        if (firebaseError.code === "auth/email-already-in-use") {
          return { error: "An account with this email already exists." };
        }
        return { error: firebaseError.message || "Registration failed." };
      }
    },
    [router]
  );

  /**
   * Login with email/password via Firebase.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        await signIn("firebase", {
          idToken: await userCredential.user.getIdToken(),
          redirect: false,
        });

        router.push("/dashboard");
        router.refresh();
        return {};
      } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        if (
          firebaseError.code === "auth/user-not-found" ||
          firebaseError.code === "auth/wrong-password" ||
          firebaseError.code === "auth/invalid-credential"
        ) {
          return { error: "Invalid email or password." };
        }
        return { error: firebaseError.message || "Login failed." };
      }
    },
    [router]
  );

  /**
   * Login with Google via Firebase.
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await signIn("firebase", {
        idToken: await result.user.getIdToken(),
        redirect: false,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        console.error("Google sign-in error:", error);
      }
    }
  }, [router]);

  /**
   * Login with GitHub via Firebase.
   */
  const loginWithGitHub = useCallback(async () => {
    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await signIn("firebase", {
        idToken: await result.user.getIdToken(),
        redirect: false,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        console.error("GitHub sign-in error:", error);
      }
    }
  }, [router]);

  /**
   * Logout from both Firebase and NextAuth.
   */
  const logout = useCallback(async () => {
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    await firebaseSignOut(auth);
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }, [router]);

  return {
    user: session?.user,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    login,
    loginWithGoogle,
    loginWithGitHub,
    register,
    logout,
    update,
  };
}
