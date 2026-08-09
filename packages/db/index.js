import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ponytail: hardcodeada para Vite (excluída de optimizeDeps, import.meta.env no se reemplaza).
// En Node.js (CF, scripts, tests) se lee de process.env.
// Firebase config es pública — API key es key web, no secreta.

const isBrowser = typeof window !== 'undefined';

let apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId, measurementId;

if (isBrowser) {
  apiKey = 'AIzaSyB4CXpSy6_DTgWpx5PNxa45rKQoxzqBz14';
  authDomain = 'house-menuapp.firebaseapp.com';
  databaseURL = 'https://house-menuapp-default-rtdb.firebaseio.com';
  projectId = 'house-menuapp';
  storageBucket = 'house-menuapp.firebasestorage.app';
  messagingSenderId = '740954318746';
  appId = '1:740954318746:web:7d143c34a0714f8fed7c23';
  measurementId = 'G-VJM6PWCKKD';
} else {
  apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'demo_key';
  authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN;
  databaseURL = process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
  projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
  messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID;
  appId = process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID;
  measurementId = process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID;
}

const firebaseConfig = { apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId, measurementId };

export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const realtimeDB = getDatabase(app);
export const auth = getAuth(app);
export const db = firestore;
export const storage = getStorage(app);

export { getSessionId, setSessionId, clearSessionId } from './sessionId.js';
