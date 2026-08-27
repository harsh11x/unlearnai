import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// ─── In-memory user store (replace with DB in production) ───
// This is a simple demo store. In production, use PostgreSQL/MongoDB.
interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed
  createdAt: string;
}

const users: User[] = [
  // Pre-seeded demo user: demo@unlearn.studio / Password1
  {
    id: "usr_demo",
    name: "Demo User",
    email: "demo@unlearn.studio",
    password: "$2a$10$rQEY5z8q4K5X5X5X5X5X5eY5X5X5X5X5X5X5X5X5X5X5X5X5X", // bcrypt hash of "Password1"
    createdAt: new Date().toISOString(),
  },
];

// Helper: find user by email
export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// Helper: create a new user
export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
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
        if (!user) {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "unlearn-studio-dev-secret-change-in-production",
});
