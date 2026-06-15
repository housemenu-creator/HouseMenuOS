import OpenAI from "openai";
import "dotenv/config";
import { getBranchInfo } from "../lib/branch.js";
import { createAdapter } from "../mcp/adapter.js";
import { loadTools, registry } from "../mcp/server.js";
import { getAgentConfigCached } from "../lib/agentConfig.js";
import { reportToolCall } from "../lib/telemetry.js";
import { initFirebase, ref, get, child } from "../lib/firebase.js";

// Lazy init to avoid circular dependency:
//   agent/index → server.ts → notificaciones.ts → whatsapp.ts → agent/index
let _adapter: ReturnType<typeof createAdapter> | null = null;
function getAdapter() {
  if (!_adapter) {
    loadTools();
    _adapter = createAdapter(() => registry.getAll());
  }
  return _adapter;
}

// ── Customer Context (AI Cliente 360) ──────────────────

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  points: number;
  lastOrderAt: string;
  createdAt: string;
  favoriteProducts: string[];
}

const db = initFirebase();

async function lookupCustomerByPhone(phone: string): Promise<CustomerProfile | null> {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 8) return null;

  try {
    const snap = await get(child(ref(db), "customers"));
    if (!snap.exists()) return null;

    const customers = snap.val() as Record<string, any>;
    for (const [id, c] of Object.entries(customers)) {
      const custPhone = (c.phone || "").replace(/[^0-9]/g, "");
      if (custPhone && custPhone.includes(cleaned.slice(-9))) {
        // Found! Now get their favorite products from order history
        const favProducts = await getFavoriteProducts(id, c.email, c.phone);
        return {
          id,
          name: c.name || "",
          phone: c.phone || "",
          email: c.email || "",
          orderCount: c.orderCount || 0,
          totalSpent: c.totalSpent || 0,
          points: c.points || 0,
          lastOrderAt: c.lastOrderAt || "",
          createdAt: c.createdAt || "",
          favoriteProducts: favProducts,
        };
      }
    }
    return null;
  } catch (e) {
    console.warn("agent.lookupCustomerByPhone error:", e);
    return null;
  }
}

async function getFavoriteProducts(customerId: string, email: string, phone: string): Promise<string[]> {
  try {
    const branchIds = (process.env.HOUSEPYSBOT_BRANCH_ID || "").split(",").map(s => s.trim()).filter(Boolean);
    const productCount = new Map<string, number>();

    for (const branchId of branchIds) {
      const snap = await get(child(ref(db), `branches/${branchId}/orders`));
      if (!snap.exists()) continue;
      const orders = Object.values(snap.val()) as any[];
      const customerOrders = orders.filter((o: any) => {
        if (email && o.customerEmail === email) return true;
        if (phone && o.customerPhone === phone) return true;
        return false;
      });
      for (const o of customerOrders) {
        for (const item of (o.items || [])) {
          const name = item.name || "?";
          productCount.set(name, (productCount.get(name) || 0) + (item.quantity || 1));
        }
      }
    }

    return Array.from(productCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  } catch {
    return [];
  }
}

function buildCustomerContext(customer: CustomerProfile): string {
  const lines: string[] = [];
  lines.push("INFORMACIÓN DEL CLIENTE (usá esto para personalizar la atención):");
  lines.push(`Nombre: ${customer.name || "No registrado"}`);
  lines.push(`Teléfono: ${customer.phone}`);
  if (customer.orderCount > 0) {
    lines.push(`Total de pedidos: ${customer.orderCount}`);
    lines.push(`Gasto total: S/ ${customer.totalSpent.toFixed(2)}`);
    lines.push(`Puntos de fidelidad: ${customer.points}`);
    if (customer.lastOrderAt) {
      const lastOrder = new Date(customer.lastOrderAt);
      const daysAgo = Math.floor((Date.now() - lastOrder.getTime()) / 86400000);
      lines.push(`Último pedido: ${daysAgo === 0 ? "hoy" : `hace ${daysAgo} días`}`);
    }
    if (customer.favoriteProducts.length > 0) {
      lines.push(`Platos favoritos: ${customer.favoriteProducts.join(", ")}`);
    }
  } else {
    lines.push("Nuevo cliente — primera vez que pide.");
  }
  lines.push("");
  lines.push("Usá esta información para saludar al cliente por su nombre y ofrecerle");
  lines.push("una atención personalizada. Preguntale si quiere repetir sus platos favoritos.");
  return lines.join("\n");
}

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
  const config = await getAgentConfigCached(branchId, agentId);

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

export interface SenderInfo {
  phone?: string;
  platform: "whatsapp" | "telegram";
}

export async function processMessage(
  message: string,
  branchId: string,
  history: Message[] = [],
  agentId: string = "atencion",
  senderInfo?: SenderInfo,
): Promise<string> {
  try {
    return await _processMessage(message, branchId, history, agentId, senderInfo);
  } catch (e: any) {
    console.error(`housepysbot agent error (${agentId}):`, e);
    const status = e.status || e.code;
    const msg = (e.message || "").toLowerCase();
    if (msg.includes("openrouter_api_key") || msg.includes("401")) {
      return "⚠️ El bot no está configurado aún. El dueño debe configurar OPENROUTER_API_KEY.";
    }
    if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
      return "⏳ Demasiadas consultas. Esperá unos segundos y volvé a intentar.";
    }
    if (status === 404 || msg.includes("unavailable") || msg.includes("not found")) {
      return "⚠️ El modelo de IA no está disponible ahora. Probá de nuevo en un momento.";
    }
    if (msg.includes("abort") || msg.includes("timeout") || msg.includes("econnaborted")) {
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
}

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.6-flash";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK || "openrouter/auto";
const MAX_TOOL_ITERATIONS = 5;

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
  agentId: string = "atencion",
  senderInfo?: SenderInfo,
): Promise<string> {
  const config = await getAgentConfigCached(branchId, agentId);
  let systemPrompt = await buildSystemPrompt(branchId, agentId);

  // ── AI Cliente 360: inject customer context for atencion agent ──
  if (agentId === "atencion" && senderInfo?.phone) {
    const customer = await lookupCustomerByPhone(senderInfo.phone);
    if (customer) {
      const customerContext = buildCustomerContext(customer);
      systemPrompt += "\n\n" + customerContext;
    }
  }

  const allowedSet = new Set(config.allowedTools);
  const allTools = getAdapter().toOpenAiTools();
  const filteredTools = allTools.filter((t) => allowedSet.has(t.function.name));

  const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const client = createClient();

  // ── Multi-turn loop ──────────────────────────────────
  // The agent can call tools, get results, and call more tools
  // up to MAX_TOOL_ITERATIONS rounds.

  for (let turn = 0; turn < MAX_TOOL_ITERATIONS; turn++) {
    const res = await callWithFallback(client, {
      messages: msgs,
      tools: filteredTools,
      tool_choice: "auto",
      max_tokens: 1024,
    });

    const choice = res.choices[0];
    if (!choice?.message) return "No pude procesar tu mensaje. Intenta de nuevo.";

    // ── No tool calls → final answer ─────────────────────
    if (!choice.message.tool_calls) {
      return choice.message.content || "Listo! ¿Algo más?";
    }

    // ── Execute tools ───────────────────────────────────
    msgs.push(choice.message);

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

      msgs.push({ role: "tool", content: result, tool_call_id: call.id });

      // ── Telemetry ─────────────────────────────────────
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

  // ── Max iterations reached → summarize ────────────────
  try {
    const finalRes = await callWithFallback(client, {
      messages: msgs,
      max_tokens: 1024,
    });
    return finalRes.choices[0]?.message?.content || "El proceso tomó varios pasos. ¿Necesitas algo más?";
  } catch {
    return "El proceso tomó varios pasos. ¿Necesitas algo más?";
  }
}
