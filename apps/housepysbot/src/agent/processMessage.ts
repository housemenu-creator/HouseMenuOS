/**
 * ProcessMessage — multi-turn agent loop with tool execution.
 *
 * This is the core conversation engine. It:
 *   1. Builds the system prompt (via prompt-builder)
 *   2. Filters tools per agent config
 *   3. Runs a multi-turn loop (LLM → tools → LLM → ... → answer)
 *   4. Reports telemetry per tool call
 *   5. Wraps errors in friendly user messages
 */
import "dotenv/config";
import { createAdapter } from "../mcp/adapter.js";
import { loadTools, registry } from "../mcp/server.js";
import { getAgentConfigCached } from "../lib/agentConfig.js";
import { reportToolCall } from "../lib/telemetry.js";
import { createClient, callWithFallback } from "./client.js";
import { buildSystemPrompt, type SenderInfo } from "./prompt-builder.js";
import logger from "../lib/logger.js";

export type { SenderInfo };

// ── Lazy adapter init (avoids circular dep) ───────────
let _adapter: ReturnType<typeof createAdapter> | null = null;
function getAdapter() {
  if (!_adapter) {
    loadTools();
    _adapter = createAdapter(() => registry.getAll());
  }
  return _adapter;
}

type Message = { role: "user" | "assistant"; content: string };

const MAX_TOOL_ITERATIONS = parseInt(process.env.AGENT_MAX_TOOL_ITERATIONS || "8", 10);

// ── Multi-turn agent loop ─────────────────────────────

async function agentLoop(
  message: string,
  branchId: string,
  history: Message[],
  agentId: string,
  systemPrompt: string,
  allowedTools: string[],
): Promise<string> {
  const allowedSet = new Set(allowedTools);
  const allTools = getAdapter().toOpenAiTools();
  const filteredTools = allTools.filter((t) => allowedSet.has(t.function.name));

  const msgs: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const client = createClient();

  for (let turn = 0; turn < MAX_TOOL_ITERATIONS; turn++) {
    const res = await callWithFallback(client, {
      messages: msgs as any,
      tools: filteredTools,
      tool_choice: "auto",
      max_tokens: 1024,
    });

    const choice = res.choices[0];
    if (!choice?.message) return "No pude procesar tu mensaje. Intenta de nuevo.";

    // No tool calls → final answer
    if (!choice.message.tool_calls) {
      return choice.message.content || "Listo! ¿Algo más?";
    }

    // Execute tools
    // ponytail: only keep role/content/tool_calls — Groq 8b rejects `reasoning` fields
    msgs.push({
      role: choice.message.role,
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
    } as any);

    for (const call of choice.message.tool_calls) {
      const t0 = Date.now();
      let result: string;
      let success = false;

      try {
        const args = JSON.parse(call.function.arguments);
        const r = await getAdapter().executeTool(call.function.name, args, branchId);
        success = r.success;
        result = r.message || (r.success ? JSON.stringify(r.data) : `Error: ${r.error}`);
      } catch (e: any) {
        result = `Error al ejecutar ${call.function.name}: ${e.message}`;
      }

      msgs.push({ role: "tool", content: result, tool_call_id: call.id } as any);

      // Telemetry (non-critical)
      try {
        const args = JSON.parse(call.function.arguments);
        reportToolCall(
          agentId,
          call.function.name,
          args,
          success ? "success" : "error",
          result.slice(0, 200),
          Date.now() - t0,
        ).catch(() => {});
      } catch {
        // telemetry failure is non-critical
      }
    }
  }

  // Max iterations reached → summarize
  try {
    const finalRes = await callWithFallback(client, {
      messages: msgs as any,
      max_tokens: 1024,
    });
    return finalRes.choices[0]?.message?.content || "El proceso tomó varios pasos. ¿Necesitas algo más?";
  } catch {
    return "El proceso tomó varios pasos. ¿Necesitas algo más?";
  }
}

// ── Error handler ─────────────────────────────────────

function friendlyError(e: any, agentId: string): string {
  logger.error(`housepysbot agent error (${agentId}):`, e);
  const status = e.status || e.code;
  const msg = (e.message || "").toLowerCase();
  const errName = (e.name || "").toLowerCase();

  if (msg.includes("openrouter_api_key") || msg.includes("openai_api_key") || msg.includes("401")) {
    return "⚠️ El bot no está configurado aún. El dueño debe configurar OPENROUTER_API_KEY.";
  }
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
    return "⏳ Demasiadas consultas. Esperá unos segundos y volvé a intentar.";
  }
  if (status === 404 || msg.includes("unavailable") || msg.includes("not found")) {
    return "⚠️ El modelo de IA no está disponible ahora. Probá de nuevo en un momento.";
  }
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("econnaborted") || errName.includes("aborterror") || errName === "aborterror") {
    return "⏱ La IA tardó demasiado en responder. Probá de nuevo.";
  }
  if (status === 402 || msg.includes("insufficient") || msg.includes("quota")) {
    return "⚠️ Sin crédito disponible en la API de IA. El dueño debe recargar.";
  }
  if (status === 500 || status === 502 || status === 503) {
    return "🔧 La IA está temporalmente caída. Probá de nuevo en unos minutos.";
  }
  return "Ocurrió un error inesperado. Probá de nuevo o escribí /help.";
}

// ── Public API ────────────────────────────────────────

/**
 * Process a user message and return the AI response.
 *
 * Orchestrates: prompt building → agent config → multi-turn loop → error wrapping.
 */
export async function processMessage(
  message: string,
  branchId: string,
  history: Message[] = [],
  agentId: string = "atencion",
  senderInfo?: SenderInfo,
): Promise<string> {
  try {
    const config = await getAgentConfigCached(branchId, agentId);
    const systemPrompt = await buildSystemPrompt(branchId, agentId, message, senderInfo);
    return await agentLoop(message, branchId, history, agentId, systemPrompt, config.allowedTools);
  } catch (e: any) {
    return friendlyError(e, agentId);
  }
}
