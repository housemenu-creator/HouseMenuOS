import { initFirebase, ref, child, get, update, onChildChanged, off } from "../lib/firebase.js";
import { getAllBranchIds } from "../lib/branch.js";
import { sendWhatsAppMessage } from "../bot/whatsapp.js";
import logger from "../lib/logger.js";

// ── Telegram sender (simple fetch, no Telegraf dependency) ──
async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: parseInt(chatId),
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json() as any;
    return data.ok === true;
  } catch {
    return false;
  }
}

/** Look up Telegram chatId by customer phone from vinculación */
async function chatIdByPhone(branchId: string, phone: string): Promise<string | null> {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length < 10) return null;
  try {
    const snap = await get(child(ref(db), `branches/${branchId}/vinculaciones/${clean}`));
    if (snap.exists()) {
      const v = snap.val() as { telegramChatId?: string };
      return v.telegramChatId || null;
    }
  } catch { /* no vinculación */ }
  return null;
}

const db = initFirebase();

/** Status transitions that trigger a notification */
const NOTIFIABLE_TRANSITIONS: Record<string, { emoji: string; message: (order: any) => string }> = {
  recibido: {
    emoji: "📩",
    message: (o) =>
      `🍔 *¡PEDIDO RECIBIDO!*\n\n` +
      `Hola ${o.cliente || "!"}, tu pedido ya fue recibido y pronto empezaremos a prepararlo.\n\n` +
      `📋 *Pedido:* #${o.shortCode || o.id?.slice(-4)?.toUpperCase() || ""}\n` +
      `💰 *Total:* S/ ${Number(o.total || 0).toFixed(2)}\n\n` +
      `Te avisaremos cuando esté listo 🙌`,
  },
  preparando: {
    emoji: "👨‍🍳",
    message: (o) =>
      `🔥 *¡TU PEDIDO ESTÁ EN COCINA!*\n\n` +
      `Hola ${o.cliente || "!"}, ya estamos preparando tu pedido.\n\n` +
      `📋 *Pedido:* #${o.shortCode || o.id?.slice(-4)?.toUpperCase() || ""}\n` +
      `💰 *Total:* S/ ${Number(o.total || 0).toFixed(2)}\n\n` +
      `En un momento lo tendremos listo 🔥`,
  },
  en_camino: {
    emoji: "🚗",
    message: (o) =>
      `🚗 *¡TU PEDIDO ESTÁ EN CAMINO!*\n\n` +
      `Hola ${o.cliente || "!"}, tu pedido ya salió del local.\n\n` +
      `📋 *Pedido:* #${o.shortCode || o.id?.slice(-4)?.toUpperCase() || ""}\n` +
      `💰 *Total:* S/ ${Number(o.total || 0).toFixed(2)}\n\n` +
      `Espéralo muy pronto 🙌`,
  },
  entregado: {
    emoji: "✅",
    message: (o) =>
      `✅ *¡PEDIDO ENTREGADO!*\n\n` +
      `Hola ${o.cliente || "!"}, tu pedido ya fue entregado.\n\n` +
      `📋 *Pedido:* #${o.shortCode || o.id?.slice(-4)?.toUpperCase() || ""}\n` +
      `💰 *Total:* S/ ${Number(o.total || 0).toFixed(2)}\n\n` +
      `¡Gracias por tu preferencia! 🙌\n\n` +
      `¿Te gustó? Dejanos tu reseña ⭐`,
  },
};

const STATUS_LABELS: Record<string, string> = {
  recibido: "Recibido",
  confirmado: "Confirmado",
  preparando: "Preparando",
  en_camino: "En Camino 🚗",
  entregado: "Entregado ✅",
  cancelado: "Cancelado ❌",
};

/**
 * Format a phone from any format to WhatsApp-compatible JID.
 * Strips +, spaces, dashes — keeps only digits.
 */
function toJid(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 10) return null;
  return `${digits}@s.whatsapp.net`;
}

function startWatcherForBranch(branchId: string): () => void {
  const ordersRef = ref(db, `branches/${branchId}/orders`);

  // In-memory cache: orderId → last known status + notifications
  const statusCache = new Map<string, string>();

  // Pre-warm: read all existing orders to know current status (blocking before listen)
  // This prevents re-notifications on restart.
  (async () => {
    try {
      const snap = await get(ordersRef);
      if (snap.exists()) {
        const orders = snap.val() as Record<string, any>;
        for (const [id, order] of Object.entries(orders)) {
          if (order?.status) {
            statusCache.set(id, order.status);
          }
        }
      }
      logger.info(`📋 OrderNotifier [${branchId}]: precargados ${statusCache.size} pedidos`);
    } catch (e) {
      logger.warn(`📋 OrderNotifier [${branchId}]: no se pudo precargar cache:`, e);
    }
  })();

  const unsub = onChildChanged(ordersRef, (snap) => {
    const order = snap.val();
    if (!order || !order.phone) return;

    const orderId = snap.key!;
    const newStatus = order.status;
    const oldStatus = statusCache.get(orderId);

    // Update cache
    statusCache.set(orderId, newStatus);

    // Skip if already notified via Firebase (survives restarts)
    const alreadyNotified = order.whatsappNotified?.[newStatus];
    if (alreadyNotified) {
      // Still update cache so we don't re-process on next change
      return;
    }

    // Skip if status didn't change (compared to in-memory cache)
    if (!newStatus || newStatus === oldStatus) return;

      // Check if this transition is notifiable
    const transition = NOTIFIABLE_TRANSITIONS[newStatus];
    if (!transition) return;

    const text = transition.message(order);
    const dbRef = ref(db, `branches/${branchId}/orders/${orderId}`);

    // Send WhatsApp
    (async () => {
      try {
        const sent = await sendWhatsAppMessage(order.phone, text);
        if (sent) {
          await update(dbRef, { [`whatsappNotified/${newStatus}`]: Date.now() });
          logger.info(`💬 [${branchId}] WA: ${order.phone} — #${(order.shortCode || orderId).slice(-4).toUpperCase()} → ${STATUS_LABELS[newStatus] || newStatus}`);
        }
      } catch (e) {
        logger.error(`❌ Error WA notify [${branchId}] ${orderId}:`, e);
      }
    })();

    // Send Telegram if cliente vinculado
    (async () => {
      try {
        const chatId = await chatIdByPhone(branchId, order.phone);
        if (!chatId) return;
        const alreadyNotified = order.telegramNotified?.[newStatus];
        if (alreadyNotified) return;
        const sent = await sendTelegramMessage(chatId, text);
        if (sent) {
          await update(dbRef, { [`telegramNotified/${newStatus}`]: Date.now() });
          logger.info(`💬 [${branchId}] TG: ${chatId} — #${(order.shortCode || orderId).slice(-4).toUpperCase()} → ${STATUS_LABELS[newStatus] || newStatus}`);
        }
      } catch (e) {
        logger.error(`❌ Error TG notify [${branchId}] ${orderId}:`, e);
      }
    })();
  });

  return () => {
    off(ordersRef);
    statusCache.clear();
  };
}

export function startOrderNotifier() {
  const branchIds = getAllBranchIds();
  const cleanups = branchIds.map((id) => startWatcherForBranch(id));
  logger.info(`💬 Order Notifier: ${branchIds.length} sucursal(es)`);
  return () => cleanups.forEach((fn) => fn());
}
