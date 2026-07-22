/**
 * RAG - Vector Store (Supabase)
 * Persistent storage with local JSON fallback
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_HEADERS = {
  'apikey': SUPABASE_KEY || '',
  'Authorization': `Bearer ${SUPABASE_KEY || ''}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const CACHE_DIR = process.env.WHATSAPP_SESSION_DIR || "./wa_session";
const CACHE_PATH = join(CACHE_DIR, "rag_cache.json");

export interface Document {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// In-memory cache (keeps things fast)
const memoryCache: Document[] = [];

// ── Local persistence ──────────────────────────────────
function loadFromDisk(): boolean {
  try {
    if (!existsSync(CACHE_PATH)) return false;
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const docs = JSON.parse(raw) as Document[];
    memoryCache.length = 0;
    memoryCache.push(...docs);
    return docs.length > 0;
  } catch {
    return false;
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_PATH, JSON.stringify(memoryCache), "utf-8");
  } catch {
    // Non-critical — memory still works
  }
}

async function addToMemory(doc: Document): Promise<void> {
  const idx = memoryCache.findIndex(d => d.id === doc.id);
  if (idx >= 0) {
    memoryCache[idx] = doc;
  } else {
    memoryCache.push(doc);
  }
}

async function syncFromSupabase(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    loadFromDisk();
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rag_documents?select=*`, {
      headers: SUPABASE_HEADERS,
    });
    if (!res.ok) { loadFromDisk(); return; }
    const data = (await res.json()) as any[];
    memoryCache.length = 0;
    memoryCache.push(...data.map((row: any) => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata || {},
      embedding: row.embedding || [],
    })));
    saveToDisk(); // persist the fresh fetch for next startup
  } catch {
    loadFromDisk(); // fallback: whatever we had on disk
  }
}

/**
 * Keyword-based query fallback (zero API calls, works offline)
 */
async function queryByKeywords(text: string, k = 3): Promise<Document[]> {
  if (memoryCache.length === 0) {
    await syncFromSupabase();
  }
  if (memoryCache.length === 0) return [];

  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return memoryCache.slice(0, k);

  return memoryCache
    .map(doc => {
      const haystack = (doc.content + ' ' + JSON.stringify(doc.metadata)).toLowerCase();
      const matches = words.filter(w => haystack.includes(w)).length;
      return { doc, score: matches / words.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter(r => r.score > 0)
    .map(r => r.doc);
}

export const vectorStore = {
  async upsert(doc: Document): Promise<void> {
    // Always update memory
    addToMemory(doc);
    saveToDisk();
    // Try to persist to Supabase
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rag_documents`, {
        method: 'POST',
        headers: { ...SUPABASE_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: doc.id,
          content: doc.content,
          source: doc.source,
          metadata: doc.metadata,
          embedding: doc.embedding,
        }),
      });
    } catch {
      // Supabase not available - OK, memory still works
    }
  },

  async bulkUpsert(docs: Document[]): Promise<void> {
    for (const doc of docs) {
      addToMemory(doc);
    }
    saveToDisk();
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rag_documents`, {
        method: 'POST',
        headers: { ...SUPABASE_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(docs.map(d => ({
          id: d.id,
          content: d.content,
          source: d.source,
          metadata: d.metadata,
          embedding: d.embedding,
        }))),
      });
    } catch {
      // OK
    }
  },

  /** Embedding search (primary) */
  async query(embedding: number[], k = 3): Promise<Document[]> {
    // Use memory cache for fast similarity search
    if (memoryCache.length === 0) {
      // Try to load from Supabase
      await syncFromSupabase();
    }
    if (memoryCache.length === 0) return [];

    return memoryCache
      .map(doc => ({
        doc,
        similarity: cosineSimilarity(embedding, doc.embedding || []),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(r => r.doc);
  },

  /** Keyword fallback (zero API calls, works offline) */
  async queryByKeywords(text: string, k = 3): Promise<Document[]> {
    return queryByKeywords(text, k);
  },

  async clear(): Promise<void> {
    memoryCache.length = 0;
    try { if (existsSync(CACHE_PATH)) unlinkSync(CACHE_PATH); } catch {}
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rag_documents`, {
        method: 'DELETE',
        headers: SUPABASE_HEADERS,
      });
    } catch {
      // OK
    }
  },

  async count(): Promise<number> {
    return memoryCache.length;
  },
};
