import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";

// ─── In-memory user store (replace with DB in production) ───
interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // hashed — optional for OAuth users
  image?: string;
  provider: string;
  createdAt: string;
}

const users: User[] = [
  // Pre-seeded demo user: demo@unlearn.studio / Password1
  {
    id: "usr_demo",
    name: "Demo User",
    email: "demo@unlearn.studio",
    password: "$2a$10$YourHashedPasswordHere",
    provider: "credentials",
    createdAt: new Date().toISOString(),
  },
];

// ─── User helpers ───
export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export async function createUser(
  name: string,
  email: string,
  password?: string,
  image?: string,
  provider: string = "credentials"
): Promise<User> {
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;

  const user: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    image,
    provider,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return user;
}

// ─── NextAuth Configuration ───
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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

    // ── Credentials (email/password) ──
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = findUserByEmail(credentials.email as string);
        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    // ── JWT: attach user ID ──
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      // For OAuth sign-ins, find or create user on first login
      if (account && account.provider !== "credentials" && token.email) {
        let dbUser = findUserByEmail(token.email);

        if (!dbUser) {
          // Auto-create user from OAuth profile
          dbUser = await createUser(
            token.name || "OAuth User",
            token.email,
            undefined, // no password for OAuth users
            token.picture || undefined,
            account.provider
          );
        }

        token.id = dbUser.id;
      }

      return token;
    },

    // ── Session: expose user ID and provider ──
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    // ── Redirect: send OAuth users to dashboard ──
    async redirect({ url, baseUrl }) {
      // After OAuth sign-in, redirect to dashboard
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "unlearn-studio-dev-secret-change-in-production",
});
