import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Centralized Firebase initialization for the entire monorepo.
// ALL apps must import from @house/db — never initialize Firebase locally.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Firestore (document DB) — used by sorteos, portal-hub
export const firestore = getFirestore(app);

// Realtime Database — used by house-menu
export const realtimeDB = getDatabase(app);

// Auth — shared across all apps
export const auth = getAuth(app);

// Legacy aliases for backward compatibility
export const db = firestore;

// Storage
export const storage = getStorage(app);

// Session ID — persistent customer identifier (decoupled from auth.uid)
export { getSessionId, setSessionId, clearSessionId } from './sessionId.js';
