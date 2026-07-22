/**
 * Message Router
 *
 * Central hub that processes normalized messages from ANY channel.
 * Calls the AI agent, then dispatches the response back via the correct adapter.
 *
 * This is the "Unified Conversation Engine" from the architecture doc.
 */

import type { NormalizedMessage } from "../channels/channel.interface.js";
import { channelRegistry } from "../channels/channel.interface.js";
import { conversationKey } from "../channels/message-normalizer.js";
import { processMessage, type SenderInfo } from "../agent/index.js";
import { getHistory, pushHistory } from "../lib/session.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { routeWhatsApp, routeTelegram } from "../agents/router.js";
import { initFirebase, ref, get, child } from "../lib/firebase.js";
import logger from "../lib/logger.js";

const db = initFirebase();

// ── Agent Routing ───────────────────────────────────────

function resolveAgentId(msg: NormalizedMessage): string {
  switch (msg.channel) {
    case "whatsapp":
      return routeWhatsApp(msg.externalUserId).agentId;
    case "telegram":
      return routeTelegram(Number(msg.externalUserId)).agentId;
    default:
      return "atencion";
  }
}

// ── Message Handler ─────────────────────────────────────

export async function handleNormalizedMessage(msg: NormalizedMessage): Promise<void> {
  const adapter = channelRegistry.get(msg.channel);
  if (!adapter) {
    logger.warn(`No adapter for channel: ${msg.channel}`);
    return;
  }

  const agentId = resolveAgentId(msg);
  const key = conversationKey(msg.channel, msg.externalUserId, agentId);

  // Rate limit
  if (!checkRateLimit(key)) {
    await adapter.sendText(msg.externalUserId, "⏳ Esperá un momento antes de enviar otro mensaje.");
    return;
  }

  // Build sender info for customer 360
  let phone = msg.metadata?.username as string || msg.externalUserId;

  // Si es Telegram, buscar vinculación con WhatsApp
  if (msg.channel === "telegram") {
    const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
    try {
      const vinculosSnap = await get(child(ref(db), `branches/${branchId}/vinculaciones`));
      if (vinculosSnap.exists()) {
        const vinculos = vinculosSnap.val() as Record<string, { telegramChatId: string }>;
        for (const [tel, v] of Object.entries(vinculos)) {
          if (v.telegramChatId === msg.externalUserId) {
            phone = tel;
            break;
          }
        }
      }
    } catch { /* si no existe el path, no hay vinculaciones aún */ }
  }

  const senderInfo: SenderInfo = {
    phone,
    platform: msg.channel as "whatsapp" | "telegram",
  };

  // Mostrar typing indicator mientras procesa
  adapter.sendAction?.(msg.externalUserId, "typing").catch(() => {});

  try {
    const history = await getHistory(key);
    const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
    const response = await processMessage(msg.text, branchId, history.slice(-10), agentId, senderInfo);

    // Telegram: detectar marcador de confirmación de pedido y agregar botones inline
    if (msg.channel === "telegram" && response.includes("[CONFIRMAR_PEDIDO]")) {
      const cleanText = response.replace("[CONFIRMAR_PEDIDO]", "").trim();
      await adapter.sendText(msg.externalUserId, cleanText, {
        buttons: [[
          { type: "callback", label: "✅ Confirmar pedido", data: `confirmar:${key}` },
          { type: "callback", label: "❌ Cancelar", data: `cancelar:${key}` },
        ]],
      });
    } else {
      await adapter.sendText(msg.externalUserId, response);
    }

    await pushHistory(key, msg.text, response);
  } catch (err) {
    logger.error(`❌ Error processing ${msg.channel} message:`, err);
    await adapter.sendText(msg.externalUserId, "Hubo un error. Intentá de nuevo.");
  }
}

/**
 * Set up the default message handler in the registry.
 * Call once at startup.
 */
export function setupMessageHandler(): void {
  channelRegistry.setHandler(handleNormalizedMessage);
}
