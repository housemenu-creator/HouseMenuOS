/**
 * RAG - Vector Store (Supabase)
 * Persistent storage with in-memory fallback
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_HEADERS = {
  'apikey': SUPABASE_KEY || '',
  'Authorization': `Bearer ${SUPABASE_KEY || ''}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

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

async function addToMemory(doc: Document): Promise<void> {
  const idx = memoryCache.findIndex(d => d.id === doc.id);
  if (idx >= 0) {
    memoryCache[idx] = doc;
  } else {
    memoryCache.push(doc);
  }
}

async function syncFromSupabase(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rag_documents?select=*`, {
      headers: SUPABASE_HEADERS,
    });
    if (!res.ok) return;
    const data = (await res.json()) as any[];
    memoryCache.length = 0;
    memoryCache.push(...data.map((row: any) => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata || {},
      embedding: row.embedding || [],
    })));
  } catch {
    // Silently fail - in-memory works without Supabase
  }
}

export const vectorStore = {
  async upsert(doc: Document): Promise<void> {
    // Always update memory
    addToMemory(doc);
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

  async clear(): Promise<void> {
    memoryCache.length = 0;
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
