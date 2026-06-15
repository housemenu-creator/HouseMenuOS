/**
 * Local type declarations for firebase/database.
 *
 * Firebase v12.13.0 ships broken types: @firebase/database 1.1.3 references
 * dist/public.d.ts which does not exist. These declarations fill the gap.
 *
 * Remove this file when firebase publishes a fix (upgrade to >12.13.0 and verify).
 */

declare module "firebase/database" {
  import { FirebaseApp } from "firebase/app";

  // ── Core types ────────────────────────────────────

  export interface Database {
    app: FirebaseApp;
    type: "database";
  }

  export interface Query {
    ref: DatabaseReference;
  }

  export interface DatabaseReference extends Query {
    key: string | null;
    parent: DatabaseReference | null;
    root: DatabaseReference;
  }

  export interface DataSnapshot {
    key: string | null;
    val(): any;
    exists(): boolean;
    forEach(action: (snapshot: DataSnapshot) => boolean | void): boolean;
    hasChild(path: string): boolean;
    hasChildren(): boolean;
    numChildren(): number;
    ref: DatabaseReference;
    toJSON(): object | null;
    child(path: string): DataSnapshot;
    priority: string | number | null;
    exportVal(): any;
  }

  export interface ThenableReference<T = unknown>
    extends DatabaseReference,
      PromiseLike<T> {}

  // ── Query types ────────────────────────────────────

  export type OrderByDirection = "asc" | "desc";

  export interface QueryConstraint {
    _type: string;
    _value: unknown;
  }

  // ── Event types ───────────────────────────────────

  export type EventType =
    | "value"
    | "child_added"
    | "child_changed"
    | "child_moved"
    | "child_removed";

  // ── Functions ──────────────────────────────────────

  export function getDatabase(app?: FirebaseApp): Database;

  export function ref(
    db: Database,
    path?: string
  ): DatabaseReference;

  export function child(
    parent: DatabaseReference,
    path: string
  ): DatabaseReference;

  export function get(query: Query): Promise<DataSnapshot>;

  export function set(
    ref: DatabaseReference,
    value: unknown
  ): Promise<void>;

  export function update(
    ref: DatabaseReference,
    values: Record<string, unknown>
  ): Promise<void>;

  export function push(
    parent: DatabaseReference,
    value?: unknown
  ): ThenableReference;

  export function remove(
    ref: DatabaseReference
  ): Promise<void>;

  export function onChildAdded(
    query: Query,
    callback: (snapshot: DataSnapshot, previousKey?: string | null) => void,
    cancelCallback?: (error: Error) => void
  ): () => void;

  export function onChildChanged(
    query: Query,
    callback: (snapshot: DataSnapshot, previousKey?: string | null) => void,
    cancelCallback?: (error: Error) => void
  ): () => void;

  export function off(
    query: Query,
    eventType?: EventType,
    callback?: (snapshot: DataSnapshot, previousKey?: string | null) => void
  ): void;

  export function query(
    query: Query,
    ...constraints: QueryConstraint[]
  ): Query;

  export function limitToLast(limit: number): QueryConstraint;

  export function orderByKey(): QueryConstraint;

  export function orderByChild(path: string): QueryConstraint;

  export function orderByValue(): QueryConstraint;

  export function startAt(value: number | string | boolean | null): QueryConstraint;

  export function endAt(value: number | string | boolean | null): QueryConstraint;

  export function equalTo(value: number | string | boolean | null): QueryConstraint;

  export function increment(delta: number): object;

  export function runTransaction(
    ref: DatabaseReference,
    transactionUpdate: (current: any) => any,
    options?: {
      applyLocally?: boolean;
    }
  ): Promise<{ committed: boolean; snapshot: DataSnapshot | null }>;

  export function onValue(
    query: Query,
    callback: (snapshot: DataSnapshot) => void,
    cancelCallback?: (error: Error) => void
  ): () => void;

  export function serverTimestamp(): object;

  export function connectDatabaseEmulator(
    db: Database,
    host: string,
    port: number
  ): void;

  export function forceWebSockets(): void;
  export function forceLongPolling(): void;
}
