import type { FirebaseApp } from "firebase/app";
import type { Database } from "firebase/database";
import type { Firestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";
import type { FirebaseStorage } from "firebase/storage";

export const app: FirebaseApp;
export const firestore: Firestore;
export const realtimeDB: Database;
export const auth: Auth;
export const db: Firestore;
export const storage: FirebaseStorage;
