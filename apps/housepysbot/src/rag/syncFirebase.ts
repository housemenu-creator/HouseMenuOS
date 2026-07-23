/**
 * RAG - Sync Data from Firebase to Vector Store
 * Fetches menu, policies, FAQs and creates embeddings
 */
import { vectorStore } from './vectorStore.js';
import { Document } from './vectorStore.js';
import { initFirebase, ref, get, child, onChildAdded, onChildChanged } from '../lib/firebase.js';
import logger from "../lib/logger.js";

// --- Types for Firebase data ---
interface Product {
  name: string;
  description?: string;
  base_price?: number;
  price?: number;
  category?: string;
  available?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  image?: string;
}

// --- Sync Menu ---
async function syncMenu(branchId: string): Promise<number> {
  try {
    const db = initFirebase();
    const snap = await get(ref(db, `branches/${branchId}/catalog/products`));

    if (!snap.exists()) return 0;

    const products = snap.val() as Record<string, Product>;
    const docs: Document[] = [];

    for (const [id, product] of Object.entries(products)) {
      if (!product.available) continue;

      const price = product.base_price || product.price || 0;
      const content = `${product.name}: ${product.description || 'Sin descripción'}. Precio: S/ ${price.toFixed(2)}`;

      docs.push({
        id: `product-${id}`,
        content,
        source: 'menu',
        metadata: {
          name: product.name,
          price,
          category: product.category || 'General',
          vegan: product.vegan || false,
          glutenFree: product.glutenFree || false,
        },
      });
    }

    await vectorStore.bulkUpsert(docs);
    return docs.length;
  } catch (e) {
    logger.error('syncMenu error:', e);
    return 0;
  }
}

// --- Sync Policies ---
async function syncPolicies(branchId: string): Promise<number> {
  try {
    const db = initFirebase();
    const snap = await get(ref(db, `branches/${branchId}/config`));

    if (!snap.exists()) return 0;

    const config = snap.val();
    const docs: Document[] = [];

    // Delivery policy
    if (config.deliveryFee !== undefined) {
      docs.push({
        id: `policy-delivery`,
        content: `Delivery: S/ ${config.deliveryFee}. Gratis desde S/ ${config.freeThreshold || 0}.`,
        source: 'policy',
        metadata: { title: 'Política de delivery' },
      });
    }

    // Hours
    if (config.schedule) {
      docs.push({
        id: `policy-schedule`,
        content: `Horario: ${config.schedule}`,
        source: 'policy',
        metadata: { title: 'Horario del restaurante' },
      });
    }

    await vectorStore.bulkUpsert(docs);
    return docs.length;
  } catch (e) {
    logger.error('syncPolicies error:', e);
    return 0;
  }
}

// --- Sync Knowledge Documents ---
async function syncKnowledge(branchId: string): Promise<number> {
  try {
    const db = initFirebase();
    const snap = await get(ref(db, `branches/${branchId}/knowledge`));
    if (!snap.exists()) return 0;

    const knowledge = snap.val() as Record<string, any>;
    const docs: Document[] = [];

    for (const [id, doc] of Object.entries(knowledge)) {
      if (!doc.content?.trim()) continue;

      docs.push({
        id: `knowledge-${id}`,
        content: doc.content,
        source: doc.source || 'knowledge',
        metadata: {
          title: doc.title || id,
          category: doc.category || 'General',
          ...(doc.metadata || {}),
        },
      });
    }

    // Track IDs so the live listener skips the initial batch
    for (const id of Object.keys(knowledge)) {
      knownKnowledgeIds.add(id);
    }

    await vectorStore.bulkUpsert(docs);
    return docs.length;
  } catch (e) {
    logger.error('syncKnowledge error:', e);
    return 0;
  }
}

// ── Live knowledge listener (real-time RAG sync) ───────
const knownKnowledgeIds = new Set<string>();

/**
 * Start a real-time listener on the knowledge node so RAG stays fresh
 * without requiring a full restart. Fires when docs are added/changed.
 */
export function startKnowledgeListener(branchId: string): () => void {
  const db = initFirebase();
  const knowledgeRef = ref(db, `branches/${branchId}/knowledge`);

  // onChildAdded fires for ALL existing children on first listen, then for new ones.
  // We skip the initial batch (already synced at startup) via knownKnowledgeIds.
  const offAdded = onChildAdded(knowledgeRef, async (snap) => {
    const id = snap.key;
    if (!id || knownKnowledgeIds.has(id)) return;
    knownKnowledgeIds.add(id);
    const doc = snap.val();
    if (!doc?.content?.trim()) return;
    await vectorStore.upsert({
      id: `knowledge-${id}`,
      content: doc.content,
      source: doc.source || 'knowledge',
      metadata: { title: doc.title || id, category: doc.category || 'General', ...(doc.metadata || {}) },
    });
    logger.info(`📘 RAG live: knowledge doc "${doc.title || id}" added`);
  });

  // onChildChanged only fires when an EXISTING doc is modified
  const offChanged = onChildChanged(knowledgeRef, async (snap) => {
    const id = snap.key;
    if (!id) return;
    const doc = snap.val();
    if (!doc?.content?.trim()) return;
    await vectorStore.upsert({
      id: `knowledge-${id}`,
      content: doc.content,
      source: doc.source || 'knowledge',
      metadata: { title: doc.title || id, category: doc.category || 'General', ...(doc.metadata || {}) },
    });
    logger.info(`📘 RAG live: knowledge doc "${doc.title || id}" updated`);
  });

  logger.info(`📘 RAG live listener started for ${branchId}`);
  return () => { offAdded(); offChanged(); };
}

// --- Full Sync ---
export async function syncBranchKnowledge(branchId: string) {
  logger.info(`🔄 Syncing knowledge for branch ${branchId}...`);

  // Clear existing
  await vectorStore.clear();

  // Sync
  const menuCount = await syncMenu(branchId);
  const policyCount = await syncPolicies(branchId);
  const knowledgeCount = await syncKnowledge(branchId);
  const total = menuCount + policyCount + knowledgeCount;

  logger.info(`✅ Synced ${total} documents (menu: ${menuCount}, policies: ${policyCount}, knowledge: ${knowledgeCount})`);
  return { menuCount, policyCount, knowledgeCount, total };
}
