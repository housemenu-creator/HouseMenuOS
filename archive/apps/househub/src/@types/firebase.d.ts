/**
 * Minimal types for firebase/database (fills missing public.d.ts in v12.13.0).
 * Only covers what househub actually uses.
 */
import { FirebaseApp } from "firebase/app";

declare module "firebase/database" {
  export interface Database { app: FirebaseApp; type: "database"; }
  export interface Query { ref: DatabaseReference; }
  export interface DatabaseReference extends Query { key: string | null; parent: DatabaseReference | null; root: DatabaseReference; }
  export interface DataSnapshot {
    key: string | null; val(): any; exists(): boolean;
    forEach(action: (s: DataSnapshot) => boolean | void): boolean;
    ref: DatabaseReference; child(path: string): DataSnapshot;
  }
  export interface QueryConstraint { _type: string; _value: unknown; }

  export function getDatabase(app?: FirebaseApp): Database;
  export function ref(db: Database, path?: string): DatabaseReference;
  export function child(parent: DatabaseReference, path: string): DatabaseReference;
  export function get(query: Query): Promise<DataSnapshot>;
  export function onValue(query: Query, cb: (s: DataSnapshot) => void, cc?: (e: Error) => void): () => void;
  export function off(query: Query, eventType?: string, cb?: Function): void;
  export function query(query: Query, ...constraints: QueryConstraint[]): Query;
  export function limitToLast(limit: number): QueryConstraint;
  export function orderByKey(): QueryConstraint;
  export function orderByChild(path: string): QueryConstraint;
  export function onChildAdded(query: Query, cb: (s: DataSnapshot, pk?: string | null) => void): () => void;
  export function onChildChanged(query: Query, cb: (s: DataSnapshot, pk?: string | null) => void): () => void;
  export function push(parent: DatabaseReference, value?: unknown): ThenableReference;
  export function set(ref: DatabaseReference, value: unknown): Promise<void>;
  export function update(ref: DatabaseReference, values: Record<string, unknown>): Promise<void>;
  export function remove(ref: DatabaseReference): Promise<void>;
  export function increment(delta: number): object;
  export function runTransaction(ref: DatabaseReference, fn: (c: any) => any): Promise<{ committed: boolean; snapshot: DataSnapshot | null }>;
  export function connectDatabaseEmulator(db: Database, host: string, port: number): void;
  export interface ThenableReference<T = unknown> extends DatabaseReference, PromiseLike<T> {}
}
