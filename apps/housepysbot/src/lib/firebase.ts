import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import type { Database } from "firebase/database";
import { getDatabase, ref, get, child, set, push, update, remove, onChildAdded, onChildChanged, off } from "firebase/database";
import "dotenv/config";

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

function getFirebaseUrl(): string | null {
  return (
    process.env.FIREBASE_DATABASE_URL ||
    process.env.VITE_FIREBASE_DATABASE_URL ||
    `https://${process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` ||
    null
  );
}

export function initFirebase() {
  if (_db) return _db;

  const databaseURL = getFirebaseUrl();
  if (!databaseURL) {
    throw new Error(
      "Configura FIREBASE_DATABASE_URL en el .env"
    );
  }

  const config = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    databaseURL,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
  };

  _app = initializeApp(config, "housepysbot");
  _db = getDatabase(_app);
  return _db;
}

export function getDb(): Database {
  if (!_db) throw new Error("Firebase no inicializado. Llama initFirebase() primero.");
  return _db;
}

export { ref, get, child, set, push, update, remove, onChildAdded, onChildChanged, off };
