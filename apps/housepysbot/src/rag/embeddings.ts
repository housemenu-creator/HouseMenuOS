/**
 * RAG - Vector Embeddings
 * NVIDIA (primary) + OpenAI (fallback)
 */
import OpenAI from 'openai';

const nvidiaClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// NVIDIA embedding models to try
const NVIDIA_EMBED_MODELS = [
  'nvidia/nv-embed-v2',
  'nvidia/nv-embedqa-mistral-7b-v2',
  'nvidia/nv-embedqa-e5-v5',
];

/**
 * Create embedding vector for a text
 * Tries NVIDIA first, falls back to OpenAI
 */
export async function createEmbedding(text: string): Promise<number[]> {
  // Try NVIDIA first
  if (process.env.NVIDIA_API_KEY) {
    for (const model of NVIDIA_EMBED_MODELS) {
      try {
        const response = await nvidiaClient.embeddings.create({
          model,
          input: text,
          encoding_format: 'float',
        });
        return response.data[0].embedding;
      } catch (e: any) {
        console.log(`❌ NVIDIA ${model} failed:`, e.message);
        if (e.message?.includes('429') || e.message?.includes('rate')) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        break; // Try next model or OpenAI
      }
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  throw new Error('No embedding API configured (NVIDIA or OpenAI)');
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
