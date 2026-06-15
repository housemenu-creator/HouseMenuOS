/**
 * Minimal types for firebase/auth and firebase/firestore (fills missing declaration files in v12.13.0).
 */
import { FirebaseApp } from "firebase/app";

// ─── firebase/auth ─────────────────────────────────────

declare module "firebase/auth" {
  export interface User {
    uid: string; email: string | null; displayName: string | null; photoURL: string | null;
    emailVerified: boolean; isAnonymous: boolean; providerData: UserInfo[];
    metadata: { creationTime?: string; lastSignInTime?: string };
    refreshToken: string; tenantId: string | null;
    delete(): Promise<void>;
    getIdToken(forceRefresh?: boolean): Promise<string>;
    toJSON(): object;
  }
  export interface UserInfo { uid: string; displayName: string | null; email: string | null; photoURL: string | null; providerId: string; }
  export interface Auth { app: FirebaseApp; name: string; currentUser: User | null; languageCode: string | null; settings: AuthSettings; tenantId: string | null; }
  export interface AuthSettings { appVerificationDisabledForTesting: boolean; }
  export interface AuthProvider { providerId: string; }
  export interface GoogleAuthProvider extends AuthProvider {}
  export interface PopupRedirectResult { user: User; credential: unknown; operationType: string; }

  export function getAuth(app?: FirebaseApp): Auth;
  export function onAuthStateChanged(auth: Auth, nextOrObserver: (user: User | null) => void, error?: (error: Error) => void, completed?: () => void): () => void;
  export function signOut(auth: Auth): Promise<void>;
  export function signInWithPopup(auth: Auth, provider: AuthProvider): Promise<PopupRedirectResult>;
  export class GoogleAuthProvider { constructor(); providerId: string; addScope(scope: string): GoogleAuthProvider; static readonly PROVIDER_ID: string; static credential(token: string, secret?: string): unknown; }
  export const browserPopupRedirectResolver: { _originPromise: Promise<never> };
}

// ─── firebase/firestore ────────────────────────────────

declare module "firebase/firestore" {
  export interface Firestore { app: FirebaseApp; type: "firestore"; }
  export interface DocumentReference<T = any> { id: string; path: string; parent: CollectionReference<T>; firestore: Firestore; withConverter<U>(converter: { fromFirestore: (snap: QueryDocumentSnapshot) => U; toFirestore: (obj: U) => any }): DocumentReference<U>; }
  export interface CollectionReference<T = any> extends Query<T> { id: string; path: string; parent: DocumentReference | null; firestore: Firestore; }
  export interface Query<T = any> { firestore: Firestore; withConverter<U>(converter: unknown): Query<U>; }
  export interface QueryDocumentSnapshot<T = any> { id: string; exists(): boolean; data(): T; get(field: string): unknown; ref: DocumentReference<T>; metadata: { fromCache: boolean; hasPendingWrites: boolean }; }
  export interface QuerySnapshot<T = any> { docs: QueryDocumentSnapshot<T>[]; empty: boolean; size: number; forEach(cb: (doc: QueryDocumentSnapshot<T>) => void): void; docChanges(): unknown[]; metadata: SnapshotMetadata; query: Query<T>; }
  export interface SnapshotMetadata { fromCache: boolean; hasPendingWrites: boolean; }
  export interface DocumentSnapshot<T = any> { id: string; exists(): boolean; data(): T | undefined; get(field: string): unknown; ref: DocumentReference<T>; metadata: SnapshotMetadata; }
  export interface QueryConstraint { _type: string; _value: unknown; }
  export interface Transaction { get<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>>; set<T>(ref: DocumentReference<T>, data: T): Transaction; update(ref: DocumentReference, data: Record<string, unknown>): Transaction; delete(ref: DocumentReference): Transaction; }
  export declare class Timestamp {
    constructor(seconds: number, nanoseconds: number);
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;
    seconds: number; nanoseconds: number;
    toDate(): Date; toMillis(): number;
    isEqual(other: Timestamp): boolean;
    valueOf(): string;
  }

  export function getFirestore(app?: FirebaseApp): Firestore;
  export function collection(db: Firestore, path: string, ...pathSegments: string[]): CollectionReference;
  export function doc(db: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function query<T>(query: CollectionReference<T> | Query<T>, ...constraints: QueryConstraint[]): Query<T>;
  export function where(fieldPath: string, opStr: string, value: unknown): QueryConstraint;
  export function orderBy(fieldPath: string, directionStr?: "asc" | "desc"): QueryConstraint;
  export function limit(limit: number): QueryConstraint;
  export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
  export function getDoc<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
  export function onSnapshot<T>(query: Query<T>, observer: { next?: (snap: QuerySnapshot<T>) => void; error?: (error: Error) => void; complete?: () => void }): () => void;
  export function onSnapshot<T>(query: Query<T>, onNext: (snap: QuerySnapshot<T>) => void, onError?: (error: Error) => void): () => void;
  export function addDoc<T>(ref: CollectionReference<T>, data: T): Promise<DocumentReference<T>>;
  export function setDoc(ref: DocumentReference, data: any): Promise<void>;
  export function updateDoc(ref: DocumentReference, data: any): Promise<void>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function increment(n: number): any;
  export function serverTimestamp(): any;
  export function runTransaction<T>(db: Firestore, updateFn: (transaction: Transaction) => Promise<T>): Promise<T>;
  export function connectFirestoreEmulator(db: Firestore, host: string, port: number): void;
}
