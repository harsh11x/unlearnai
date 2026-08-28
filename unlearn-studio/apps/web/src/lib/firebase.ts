import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Only initialize Firebase if API key is available (won't work on server without env vars)
const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let analytics: ReturnType<typeof getAnalytics> | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  // Analytics (client only)
  if (typeof window !== "undefined") {
    try {
      analytics = getAnalytics(app);
    } catch {}
  }
}

// ── Auth Providers ──
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

// ── User Document Type ──
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: "free" | "basic" | "pro" | "business";
  planStatus: "active" | "trialing" | "cancelled" | "expired";
  trialEndsAt: number | null;
  modelsUsed: number;
  modelsLimit: number;
  stepsLimit: number;
  createdAt: number;
  updatedAt: number;
}

// ── Default user data for new signups ──
const DEFAULT_USER_DATA: Omit<UserData, "uid" | "createdAt" | "updatedAt"> = {
  email: null,
  displayName: null,
  photoURL: null,
  plan: "free",
  planStatus: "active",
  trialEndsAt: null,
  modelsUsed: 0,
  modelsLimit: 1,
  stepsLimit: 50,
};

// ══════════════════════════════════════════
// AUTH FUNCTIONS
// ══════════════════════════════════════════

async function createOrUpdateUserDoc(user: User) {
  const firestoreDb = requireDb();
  const userRef = doc(firestoreDb, "users", user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    // Update last login
    await updateDoc(userRef, {
      lastLoginAt: Date.now(),
      ...(user.displayName && { displayName: user.displayName }),
      ...(user.photoURL && { photoURL: user.photoURL }),
    });
    return existing.data() as UserData;
  }

  // Create new user document
  const newUserData: UserData = {
    ...DEFAULT_USER_DATA,
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(userRef, newUserData);
  return newUserData;
}

function requireAuth(): ReturnType<typeof getAuth> {
  if (!auth) throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY in your environment.");
  return auth;
}

function requireDb(): ReturnType<typeof getFirestore> {
  if (!db) throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY in your environment.");
  return db;
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(requireAuth(), googleProvider);
  await createOrUpdateUserDoc(result.user);
  return result.user;
}

export async function loginWithApple() {
  const result = await signInWithPopup(requireAuth(), appleProvider);
  await createOrUpdateUserDoc(result.user);
  return result.user;
}

export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(requireAuth(), email, password);
  await createOrUpdateUserDoc(result.user);
  return result.user;
}

export async function signupWithEmail(email: string, password: string, displayName?: string) {
  const result = await createUserWithEmailAndPassword(requireAuth(), email, password);

  if (displayName) {
    await updateProfile(result.user, { displayName });
  }

  const userData = await createOrUpdateUserDoc(result.user);
  return { user: result.user, userData };
}

export async function logout() {
  await signOut(requireAuth());
}

// ══════════════════════════════════════════
// SUBSCRIPTION / PLAN FUNCTIONS
// ══════════════════════════════════════════

export async function getUserData(uid: string): Promise<UserData | null> {
  if (!isFirebaseConfigured) return null;
  const firestoreDb = requireDb();
  const userRef = doc(firestoreDb, "users", uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserData;
}

export async function updatePlan(uid: string, plan: UserData["plan"]) {
  const firestoreDb = requireDb();
  const userRef = doc(firestoreDb, "users", uid);

  const planLimits: Record<UserData["plan"], { modelsLimit: number; stepsLimit: number }> = {
    free: { modelsLimit: 1, stepsLimit: 50 },
    basic: { modelsLimit: 5, stepsLimit: 500 },
    pro: { modelsLimit: 999, stepsLimit: 2000 },
    business: { modelsLimit: 999, stepsLimit: 10000 },
  };

  await updateDoc(userRef, {
    plan,
    planStatus: plan === "free" ? "active" : "active",
    ...planLimits[plan],
    updatedAt: Date.now(),
  });
}

export async function incrementModelsUsed(uid: string) {
  const firestoreDb = requireDb();
  const userRef = doc(firestoreDb, "users", uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    const data = snapshot.data() as UserData;
    await updateDoc(userRef, {
      modelsUsed: data.modelsUsed + 1,
      updatedAt: Date.now(),
    });
  }
}

export { auth, db, analytics, onAuthStateChanged, isFirebaseConfigured };
export type { User };
