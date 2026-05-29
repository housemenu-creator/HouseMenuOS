import { getDb } from "./firebase.js";
import { ref, push, query, limitToLast, orderByKey, get } from "firebase/database";

type Message = { role: "user" | "assistant"; content: string };

const cache = new Map<string, { messages: Message[]; expiresAt: number }>();
const MAX_HISTORY = 20;
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const MAX_CACHE_SIZE = 500;

function trimCache() {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const entries = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const toDelete = cache.size - MAX_CACHE_SIZE;
  for (let i = 0; i < toDelete; i++) {
    cache.delete(entries[i][0]);
  }
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now > val.expiresAt) cache.delete(key);
  }
}

function getCached(key: string): Message[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.messages;
}

function setCached(key: string, messages: Message[]) {
  cache.set(key, { messages, expiresAt: Date.now() + CACHE_TTL });
  trimCache();
}

export async function getHistory(key: string): Promise<Message[]> {
  cleanExpired();
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const db = getDb();
    const snap = await get(
      query(ref(db, `chats/${key}`), orderByKey(), limitToLast(MAX_HISTORY))
    );
    const messages: Message[] = [];
    if (snap.exists()) {
      snap.forEach((child) => {
        const val = child.val();
        messages.push({ role: val.role, content: val.content });
      });
    }
    setCached(key, messages);
    return messages;
  } catch (e) {
    console.warn("session.getHistory error:", e);
    return [];
  }
}

export async function pushHistory(key: string, user: string, assistant: string) {
  cleanExpired();
  const prev = getCached(key) || [];
  const updated = [
    ...prev,
    { role: "user" as const, content: user },
    { role: "assistant" as const, content: assistant },
  ];
  setCached(key, updated.slice(-MAX_HISTORY));

  try {
    const db = getDb();
    const chatRef = ref(db, `chats/${key}`);
    push(chatRef, { role: "user", content: user, ts: Date.now() });
    push(chatRef, { role: "assistant", content: assistant, ts: Date.now() });
  } catch (e) {
    console.error("session fb push error:", e);
  }
}
