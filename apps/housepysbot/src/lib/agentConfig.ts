/**
 * Agent Configuration Service — Firebase-backed with in-memory TTL cache.
 *
 * Agent configs can be edited at:
 *   branches/{BRANCH}/system/agents/{agentId}/
 *
 * Falls back to hardcoded defaults (src/agents/config.ts) if not in Firebase.
 */

import { initFirebase, get, child, ref, update } from "./firebase.js";
import type { AgentConfig } from "../agents/config.js";
import { AGENTS as FALLBACK_AGENTS } from "../agents/config.js";

const db = initFirebase();

// ── In-memory TTL cache ───────────────────────────────

interface CacheEntry {
  config: AgentConfig;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 minute — fast enough for edits, avoids Firebase spam

// ── Firebase path helpers ─────────────────────────────

function configPath(branchId: string, agentId: string): string {
  return `branches/${branchId}/system/agents/${agentId}`;
}

export function configToolsPath(branchId: string, agentId: string): string {
  return `${configPath(branchId, agentId)}/allowedTools`;
}

// ── Read ──────────────────────────────────────────────

export async function getAgentConfigFromFirebase(
  branchId: string,
  agentId: string
): Promise<AgentConfig | null> {
  try {
    const snapshot = await get(child(ref(db), configPath(branchId, agentId)));
    if (!snapshot.exists()) return null;

    const data = snapshot.val();
    return {
      id: agentId,
      name: data.name || agentId,
      systemPrompt: data.systemPrompt || "",
      allowedTools: Array.isArray(data.allowedTools) ? data.allowedTools : [],
    };
  } catch (e) {
    console.warn(`agentConfig.getAgentConfigFromFirebase error (${agentId}):`, e);
    return null;
  }
}

export async function getAgentConfigCached(
  branchId: string,
  agentId: string
): Promise<AgentConfig> {
  const cacheKey = `${branchId}:${agentId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.config;
  }

  // Try Firebase first
  const fbConfig = await getAgentConfigFromFirebase(branchId, agentId);
  if (fbConfig) {
    cache.set(cacheKey, { config: fbConfig, expiresAt: Date.now() + CACHE_TTL_MS });
    return fbConfig;
  }

  // Fallback to hardcoded
  const fallback = FALLBACK_AGENTS[agentId];
  if (!fallback) {
    throw new Error(
      `Agente "${agentId}" no encontrado. Disponibles: ${Object.keys(FALLBACK_AGENTS).join(", ")}`
    );
  }
  cache.set(cacheKey, { config: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
  return fallback;
}

// ── Write (for seeding / admin UI) ────────────────────

export async function saveAgentConfig(
  branchId: string,
  agentId: string,
  config: Omit<AgentConfig, "id">
): Promise<void> {
  await update(child(ref(db), configPath(branchId, agentId)), {
    name: config.name,
    systemPrompt: config.systemPrompt,
    allowedTools: config.allowedTools,
    updatedAt: Date.now(),
  });

  // Bust cache
  const cacheKey = `${branchId}:${agentId}`;
  cache.delete(cacheKey);
}

// ── Cache control ─────────────────────────────────────

export function clearAgentConfigCache(branchId?: string, agentId?: string) {
  if (branchId && agentId) {
    cache.delete(`${branchId}:${agentId}`);
  } else if (branchId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${branchId}:`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}
