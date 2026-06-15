/**
 * Telemetry — Publica heartbeat, logs y métricas del agente a Firebase.
 *
 * Cada agente llama a estos métodos para que HouseHub pueda monitorearlos.
 *
 * Uso:
 *   import { reportHeartbeat, reportToolCall, reportError } from "../lib/telemetry.js";
 *
 *   reportHeartbeat("atencion", { messagesToday: 5, toolsExecuted: 3 });
 *   reportToolCall("atencion", "crear_pedido", { cliente: "Juan" }, "success", "Pedido creado", 1200, "chat-123");
 */
import { initFirebase, ref, set, push, update, child } from "./firebase.js";
import { increment } from "firebase/database";
import { get } from "firebase/database";

const db = initFirebase();

const BRANCH = process.env.HOUSEPYSBOT_BRANCH_ID || "default";
const BASE = `branches/${BRANCH}/system`;

const DAILY_KEY = new Date().toISOString().split("T")[0];
const HOURLY_KEY = `${DAILY_KEY}/${new Date().getHours()}`;

// ── Heartbeat ──────────────────────────────────────────

export async function reportHeartbeat(
  agentId: string,
  metrics: { messagesToday: number; toolsExecuted: number }
) {
  try {
    const payload = {
      status: "online",
      lastSeen: Date.now(),
      messagesToday: metrics.messagesToday,
      toolsExecuted: metrics.toolsExecuted,
      version: "0.1.0",
    };
    await set(child(ref(db), `${BASE}/agents/${agentId}`), payload);
  } catch (e) {
    console.warn(`telemetry.heartbeat error (${agentId}):`, e);
  }
}

// ── Helpers ─────────────────────────────────────────────

/** Recursively remove undefined values (Firebase RTDB no acepta undefined) */
function sanitize(val: unknown): unknown {
  if (val === undefined) return null;
  if (val === null || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(sanitize);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    clean[k] = sanitize(v);
  }
  return clean;
}

// ── Tool Call Log ──────────────────────────────────────

export async function reportToolCall(
  agentId: string,
  tool: string,
  args: unknown,
  result: "success" | "error",
  message: string,
  duration: number,
  chatId?: string
) {
  try {
    const logRef = push(child(ref(db), `${BASE}/logs`));
    await set(logRef, {
      agentId,
      tool,
      args: sanitize(args),
      result,
      message,
      duration,
      chatId: chatId || "",
      timestamp: Date.now(),
    });

    // Update metrics
    await update(child(ref(db), `${BASE}/metrics/daily/${DAILY_KEY}`), {
      totalTools: increment(1),
      totalMessages: increment(1),
    });

    // Hourly aggregation
    await update(child(ref(db), `${BASE}/metrics/daily/${HOURLY_KEY}`), {
      totalTools: increment(1),
    });
  } catch (e) {
    console.warn(`telemetry.toolCall error:`, e);
  }
}

// ── Error Reporting ────────────────────────────────────

export async function reportError(
  agentId: string,
  message: string,
  tool?: string
) {
  try {
    const errRef = push(child(ref(db), `${BASE}/errors`));
    await set(errRef, {
      agentId,
      tool: tool || "",
      message,
      resolved: false,
      timestamp: Date.now(),
    });

    await update(child(ref(db), `${BASE}/metrics/daily/${DAILY_KEY}`), {
      totalErrors: increment(1),
    });
  } catch (e) {
    console.warn(`telemetry.error error:`, e);
  }
}

// ── System Health ──────────────────────────────────────

export async function reportSystemHealth(health: {
  firebase: "ok" | "error";
  openrouter: "ok" | "error";
  uptime: number;
}) {
  try {
    await set(child(ref(db), `${BASE}/system`), sanitize({
      ...health,
      lastHeartbeat: Date.now(),
    }));
  } catch (e) {
    console.warn(`telemetry.systemHealth error:`, e);
  }
}

// ── Helpers ────────────────────────────────────────────
