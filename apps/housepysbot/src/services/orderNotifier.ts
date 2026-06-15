import { initFirebase, ref, child, get, update, onChildChanged, off } from "../lib/firebase.js";
import { getAllBranchIds } from "../lib/branch.js";
import { sendWhatsAppMessage } from "../bot/whatsapp.js";

const db = initFirebase();

/** Status transitions that trigger a WhatsApp notification */
const NOTIFIABLE_TRANSITIONS: Record<string, { emoji: string; message: (order: any) => string }> = {
  en_camino: {
    emoji: "🚗",
    message: (o) =>
      `🍔 *¡TU PEDIDO ESTÁ EN CAMINO!*\n\n` +
      `Hola ${o.cliente || "!"}, tu pedido ya salió del local.\n\n` +
      `📋 *Pedido:* #${o.shortCode || o.id?.slice(-4)?.toUpperCase() || ""}\n` +
      `💰 *Total:* S/ ${Number(o.total || 0).toFixed(2)}\n\n` +
      `Espéralo muy pronto 🙌`,
  },
  entregado: {
    emoji: "✅",
    message: (o) =>
      `🎉 *¡PEDIDO ENTREGADO!*\n\n` +
      `Hola ${o.cliente || "!"}, tu pedido ya fue entregado.\n\n` +
      `📋 *Pedido:* #${o.shortCode || o.id?.slice(-4)?.toUpperCase() || ""}\n` +
      `💰 *Total:* S/ ${Number(o.total || 0).toFixed(2)}\n\n` +
      `¡Gracias por tu preferencia! 🙌\n\n` +
      `¿Te gustó? Déjanos tu reseña en el tracker del pedido ⭐`,
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
      console.log(`📋 OrderNotifier [${branchId}]: precargados ${statusCache.size} pedidos`);
    } catch (e) {
      console.warn(`📋 OrderNotifier [${branchId}]: no se pudo precargar cache:`, e);
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

    // Send WhatsApp
    (async () => {
      try {
        const text = transition.message(order);
        const sent = await sendWhatsAppMessage(order.phone, text);

        if (sent) {
          // Persist notification to Firebase — survives restarts
          const dbRef = ref(db, `branches/${branchId}/orders/${orderId}`);
          await update(dbRef, {
            [`whatsappNotified/${newStatus}`]: Date.now(),
          });

          console.log(
            `💬 [${branchId}] Notificado ${order.phone} — #${(order.shortCode || orderId).slice(-4).toUpperCase()} → ${STATUS_LABELS[newStatus] || newStatus}`
          );
        }
      } catch (e) {
        console.error(`❌ Error notificando pedido [${branchId}] ${orderId}:`, e);
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
  console.log(`💬 Order Notifier: ${branchIds.length} sucursal(es)`);
  return () => cleanups.forEach((fn) => fn());
}
