import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { authConfig } from "./auth.config";

// ─── Verify Firebase ID token ───
async function verifyFirebaseToken(idToken: string) {
  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(idToken);
    return {
      id: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || decoded.email?.split("@")[0] || "User",
      image: decoded.picture || null,
    };
  } catch {
    return null;
  }
}

// ─── NextAuth Configuration ───
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    // ── Google OAuth ──
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // ── GitHub OAuth ──
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),

    // ── Firebase ID Token ──
    Credentials({
      name: "firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        return await verifyFirebaseToken(credentials.idToken as string);
      },
    }),
  ],
});
