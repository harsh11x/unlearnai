import { cert, initializeApp, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let firebaseAdmin: App | null = null;

function getFirebaseAdmin(): App {
  if (firebaseAdmin) return firebaseAdmin;

  if (getApps().length > 0) {
    firebaseAdmin = getApps()[0];
    return firebaseAdmin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  firebaseAdmin = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  return firebaseAdmin;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseAdmin());
}
