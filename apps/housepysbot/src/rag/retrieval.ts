/**
 * RAG - Retrieval + Context Builder
 * Retrieves relevant docs and formats them for the LLM system prompt
 */
import { vectorStore, Document } from './vectorStore.js';
import { createEmbedding } from './embeddings.js';
import logger from "../lib/logger.js";

/**
 * Retrieve relevant context for a user query
 */
export async function getRelevantContext(query: string, k = 3): Promise<string> {
  // Try embedding search first, fall back to keyword matching
  let docs: Document[];
  try {
    const embedding = await createEmbedding(query);
    docs = await vectorStore.query(embedding, k);
  } catch {
    logger.warn("Embedding API unavailable, using keyword fallback");
    docs = await vectorStore.queryByKeywords(query, k);
  }
  if (docs.length === 0) return '';

  const parts = docs.map(doc => {
    if (doc.source === 'menu') {
      return `📋 ${doc.metadata.name} - S/ ${doc.metadata.price}
${doc.content}
Categoría: ${doc.metadata.category || 'General'}`;
    } else if (doc.source === 'policy') {
      return `📜 ${doc.metadata.title}
${doc.content}`;
    } else {
      return `ℹ️ ${doc.content}`;
    }
  });

  return `--- CONOCIMIENTO RELEVANTE ---
${parts.join('\n\n')}
---`;
}

/**
 * Format documents for system prompt injection
 */
export function formatDocuments(docs: Document[]): string {
  if (docs.length === 0) return '';

  const sections = docs.map(doc => {
    const meta = Object.entries(doc.metadata || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    return `[${doc.source.toUpperCase()}] ${doc.content}${meta ? ` (${meta})` : ''}`;
  });

  return `Contexto del restaurante:
${sections.join('\n')}`;
}
