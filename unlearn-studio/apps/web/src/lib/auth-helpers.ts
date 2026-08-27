"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook providing convenient auth methods.
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { error: "Invalid email or password." };
      }

      router.push("/dashboard");
      router.refresh();
      return {};
    },
    [router]
  );

  const loginWithGoogle = useCallback(async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const loginWithGitHub = useCallback(async () => {
    await signIn("github", { callbackUrl: "/dashboard" });
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { error: data.error || "Registration failed." };
        }

        // Auto-login after successful registration
        const loginResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginResult?.error) {
          router.push("/login");
          return {};
        }

        router.push("/dashboard");
        router.refresh();
        return {};
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
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
