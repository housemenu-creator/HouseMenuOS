/**
 * Task Executor — executes a single instruction with the LLM + MCP tools.
 *
 * Unlike processMessage(), this is stateless: no history, no customer lookup,
 * no multi-turn loop. Takes an instruction, runs it, returns a structured result.
 *
 * Called by the scheduler for each due task.
 */

import OpenAI from "openai";
import { createAdapter } from "../mcp/adapter.js";
import { loadTools, registry } from "../mcp/server.js";

// ── Types ──────────────────────────────────────────────

export interface ToolCallRecord {
  herramienta: string;
  args: Record<string, unknown>;
  resultado: unknown;
  duracion_ms: number;
  success: boolean;
}

export interface ExecutionResult {
  success: boolean;
  summary: string;
  toolCalls: ToolCallRecord[];
  error?: string;
  rawOutput?: string;
}

// ── Globals ────────────────────────────────────────────

// Ensure tools are loaded (idempotent)
loadTools();
const adapter = createAdapter(() => registry.getAll());

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.6-flash";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK || "openrouter/auto";

// ── Helpers ────────────────────────────────────────────

function createClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY no configurada");
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/archiphone/House-Portal-OS",
      "X-Title": "HousePySbot-Tasks",
    },
  });
}

async function callLLM(
  client: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  const lastErr: Error[] = [];

  for (const model of models) {
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await client.chat.completions.create(
          {
            ...(tools ? { messages, model, tools, tool_choice: "auto" as const } : { messages, model }),
            max_tokens: 2048,
            stream: false,
          },
          { signal: controller.signal },
        );
        clearTimeout(timeout);
        return res as OpenAI.Chat.Completions.ChatCompletion;
      } catch (e: any) {
        lastErr.push(e);
        const retryable = [429, 402, 500, 502, 503].includes(e.status) || e.name === "AbortError";
        if (attempt === 0 && retryable) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        // Try next model
        break;
      }
    }
  }
  throw lastErr[lastErr.length - 1] || new Error("No hay modelos disponibles");
}

// ── Main executor ─────────────────────────────────────

export async function executeTask(
  instruccion: string,
  allowedTools: string[],
  branchId: string,
): Promise<ExecutionResult> {
  const systemPrompt =
    "Sos un asistente de gestión de restaurante. Ejecutá la siguiente instrucción usando las herramientas disponibles.\n\n" +
    "REGLAS:\n" +
    "- Usá las herramientas que necesites para completar la instrucción.\n" +
    "- Si una herramienta falla, intentá con otra o reportá el error.\n" +
    "- Cuando termines, devolvé un resumen CLARO y CONCRETO de lo que hiciste.\n" +
    "- Incluí números: cuántos mensajes enviaste, cuántos cupones generaste, etc.\n" +
    "- Si el resultado fue parcial (algunos clientes sin WhatsApp), mencionálo.\n";

  const toolCalls: ToolCallRecord[] = [];
  const startTime = Date.now();

  try {
    // Get all tools and filter by allowed list (empty list is OK — LLM will respond with text only)
    const allTools = adapter.toOpenAiTools();
    const filteredTools = allTools.filter((t) => allowedTools.includes(t.function.name));

    const client = createClient();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: instruccion },
    ];

    // ── Step 1: LLM decides what tools to call ──────────
    const res1 = await callLLM(client, messages, filteredTools);
    const choice1 = res1.choices[0]?.message;

    if (!choice1) {
      return { success: false, error: "No hubo respuesta de la IA.", summary: "", toolCalls: [] };
    }

    if (!choice1.tool_calls || choice1.tool_calls.length === 0) {
      // LLM didn't need tools — just return its text
      return {
        success: true,
        summary: choice1.content || "Instrucción procesada.",
        toolCalls: [],
        rawOutput: choice1.content || "",
      };
    }

    // ── Step 2: Execute each tool ───────────────────────
    messages.push(choice1);

    for (const call of choice1.tool_calls) {
      const t0 = Date.now();
      let result: unknown;
      let success = false;
      let parsedArgs: Record<string, unknown> = {};

      try {
        // Defensive parse: handle common LLM JSON issues
        const raw = call.function.arguments
          .replace(/\n/g, " ")
          .replace(/\t/g, " ")
          .replace(/,(\s*[}\]])/g, "$1"); // strip trailing commas
        parsedArgs = JSON.parse(raw);
        const r = await adapter.executeTool(call.function.name, parsedArgs, branchId);
        success = r.success;
        result = r.message || (r.success ? JSON.stringify(r.data) : `Error: ${r.error}`);
      } catch (e: any) {
        result = `Error al ejecutar ${call.function.name}: ${e.message}`;
      }

      const duration = Date.now() - t0;
      toolCalls.push({
        herramienta: call.function.name,
        args: parsedArgs,
        resultado: result,
        duracion_ms: duration,
        success,
      });

      const resultStr = typeof result === "string" ? result : JSON.stringify(result);
      messages.push({ role: "tool", content: resultStr, tool_call_id: call.id });
    }

    // ── Step 3: LLM summarizes ──────────────────────────
    const res2 = await callLLM(client, messages);
    const summary = res2.choices[0]?.message?.content || "Tarea ejecutada.";

    const allOk = toolCalls.every((t) => t.success);
    const someOk = toolCalls.some((t) => t.success);

    return {
      success: someOk,
      summary,
      toolCalls,
      rawOutput: summary,
      error: allOk ? undefined : `${toolCalls.filter((t) => !t.success).length} herramienta(s) fallaron`,
    };
  } catch (e: any) {
    return {
      success: false,
      error: `Error ejecutando tarea: ${e.message}`,
      summary: "",
      toolCalls,
    };
  }
}
