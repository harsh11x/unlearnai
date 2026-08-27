import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB495vJdyGVZpAfACqdAuRuEFY9awF3kPk",
  authDomain: "nullmind-3aadf.firebaseapp.com",
  projectId: "nullmind-3aadf",
  storageBucket: "nullmind-3aadf.firebasestorage.app",
  messagingSenderId: "654367039693",
  appId: "1:654367039693:web:83fca741f9f0de64b60984",
  measurementId: "G-FCFCW60PCZ",
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase Auth instance (client-side)
export const auth = getAuth(app);
export default app;
