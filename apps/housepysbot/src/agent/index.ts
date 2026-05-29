import OpenAI from "openai";
import "dotenv/config";
import { getBranchInfo } from "../lib/branch.js";
import { createAdapter } from "../mcp/adapter.js";
import { loadTools, registry } from "../mcp/server.js";
import { getAgentConfig } from "../agents/config.js";

loadTools();
const adapter = createAdapter(() => registry.getAll());

function createClient() {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Configura OPENROUTER_API_KEY en el .env (o OPENAI_API_KEY)"
    );
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/archiphone/House-Portal-OS",
      "X-Title": "HousePySbot",
    },
  });
}

async function buildSystemPrompt(
  branchId: string,
  agentId: string
): Promise<string> {
  const info = await getBranchInfo(branchId);
  const config = getAgentConfig(agentId);

  const name = info?.name || "el restaurante";
  const address = info?.address ? `📍 Dirección: ${info.address}` : "";
  const phone = info?.phone ? `📞 Teléfono: ${info.phone}` : "";
  const schedule = info?.schedule ? `🕐 Horario: ${info.schedule}` : "";
  const delivery = info?.deliveryEnabled
    ? `🚚 Delivery: S/ ${info.deliveryFee?.toFixed(2)} (gratis desde S/ ${info.freeThreshold?.toFixed(2)})`
    : "";

  const infoLines = [
    `Nombre: ${name}`,
    address,
    phone,
    schedule,
    delivery,
  ]
    .filter(Boolean)
    .join("\n");

  return config.systemPrompt.replace(
    "INFORMACIÓN DEL RESTAURANTE:\nNombre: {name}{address}{phone}{schedule}{delivery}",
    infoLines
  );
}

type Message = { role: "user" | "assistant"; content: string };

export async function processMessage(
  message: string,
  branchId: string,
  history: Message[] = [],
  agentId: string = "atencion"
): Promise<string> {
  try {
    return await _processMessage(message, branchId, history, agentId);
  } catch (e: any) {
    console.error(`housepysbot agent error (${agentId}):`, e);
    if (e.message?.includes("OPENROUTER_API_KEY")) {
      return "HousePySbot no está configurado aún. El dueño debe configurar OPENROUTER_API_KEY en el .env.";
    }
    return "Ocurrió un error interno. Intenta de nuevo.";
  }
}

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.6-flash";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK || "openrouter/owl-alpha";

async function callWithFallback(
  client: ReturnType<typeof createClient>,
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, "model">,
  retries = 1
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await client.chat.completions.create(
          { ...params, model, stream: false },
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        return res as OpenAI.Chat.Completions.ChatCompletion;
      } catch (e: any) {
        const isRetryable = [429, 402, 500, 502, 503].includes(e.status) || e.name === "AbortError";
        if (attempt < retries && isRetryable) {
          console.log(`⚠ Modelo ${model} (intento ${attempt + 1}): ${e.message}, reintentando...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (model === models[models.length - 1] && attempt === retries) {
          throw e;
        }
        console.log(`⚠ Modelo ${model} falló, probando fallback: ${e.message}`);
      }
    }
  }
  throw new Error("No hay modelos disponibles");
}

async function _processMessage(
  message: string,
  branchId: string,
  history: Message[] = [],
  agentId: string = "atencion"
): Promise<string> {
  const config = getAgentConfig(agentId);
  const systemPrompt = await buildSystemPrompt(branchId, agentId);

  const allowedSet = new Set(config.allowedTools);
  const allTools = adapter.toOpenAiTools();
  const filteredTools = allTools.filter((t) => allowedSet.has(t.function.name));

  const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const client = createClient();

  const first = await callWithFallback(client, {
    messages: msgs,
    tools: filteredTools,
    tool_choice: "auto",
    max_tokens: 1024,
  });

  const choice = first.choices[0];
  if (!choice?.message) return "No pude procesar tu mensaje. Intenta de nuevo.";

  // ── Tool calls: execute and return ────────────────────────
  if (choice.message.tool_calls) {
    msgs.push(choice.message);
    for (const call of choice.message.tool_calls) {
      let result: string;
      try {
        const args = JSON.parse(call.function.arguments);
        const r = await adapter.executeTool(call.function.name, args, branchId);
        result = r.message || (r.success ? JSON.stringify(r.data) : `Error: ${r.error}`);
      } catch (e: any) {
        result = `Error al ejecutar ${call.function.name}: ${e.message}`;
      }
      msgs.push({ role: "tool", content: result, tool_call_id: call.id });
    }

    const finalRes = await callWithFallback(client, {
      messages: msgs,
      max_tokens: 1024,
    });
    return finalRes.choices[0]?.message?.content || "Listo! ¿Algo más?";
  }

  // ── Model ignored tools — retry with explicit tool instruction ──
  if (filteredTools.length > 0) {
    const retry = await callWithFallback(client, {
      messages: [
        ...msgs,
        { role: "system", content: "You MUST use one of the available tools to answer the user's request. Do NOT respond without calling a tool first." },
      ],
      tools: filteredTools,
      tool_choice: "auto",
      max_tokens: 1024,
    });
    const retryChoice = retry.choices[0];
    if (retryChoice?.message?.tool_calls) {
      msgs.push(retryChoice.message);
      for (const call of retryChoice.message.tool_calls) {
        let result: string;
        try {
          const args = JSON.parse(call.function.arguments);
          const r = await adapter.executeTool(call.function.name, args, branchId);
          result = r.message || (r.success ? JSON.stringify(r.data) : `Error: ${r.error}`);
        } catch (e: any) {
          result = `Error al ejecutar ${call.function.name}: ${e.message}`;
        }
        msgs.push({ role: "tool", content: result, tool_call_id: call.id });
      }
      const finalRes = await callWithFallback(client, {
        messages: msgs,
        max_tokens: 1024,
      });
      return finalRes.choices[0]?.message?.content || "Listo! ¿Algo más?";
    }
    console.warn(`⚠ ${PRIMARY_MODEL} no usó tools pese a instrucción explícita`);
  }

  const reply = choice.message.content || (choice.message as any).reasoning || null;
  return reply || "No entendí bien. ¿Puedes repetirlo?";
}
