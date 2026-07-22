/**
 * Notify — Sistema cross-channel de notificaciones proactivas.
 *
 * Resuelve el canal del cliente (Telegram o WhatsApp) y envía el mensaje
 * por el adapter correcto. Un solo punto de entrada para re-engagement,
 * carrito abandonado, recordatorios, etc.
 */

import { channelRegistry } from "../channels/channel.interface.js";
import { initFirebase, ref, get, child } from "../lib/firebase.js";
import { sendWhatsAppMessage } from "../bot/whatsapp.js";

const db = initFirebase();

async function findTelegramChatId(phone: string): Promise<string | null> {
  try {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length < 8) return null;

    const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
    const snap = await get(child(ref(db), `branches/${branchId}/vinculaciones`));
    if (!snap.exists()) return null;

    const vinculos = snap.val() as Record<string, { telegramChatId: string }>;
    for (const [tel, v] of Object.entries(vinculos)) {
      if (tel.replace(/[^0-9]/g, "").includes(cleaned.slice(-9))) {
        return v.telegramChatId;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enviar notificación a un cliente por su número de teléfono.
 * Resuelve automáticamente Telegram (si vinculado) o WhatsApp.
 */
export async function notify(phone: string, text: string): Promise<boolean> {
  const tgChatId = await findTelegramChatId(phone);

  if (tgChatId) {
    const tg = channelRegistry.get("telegram");
    if (tg) {
      await tg.sendText(tgChatId, text);
      return true;
    }
  }

  // Fallback a WhatsApp
  try {
    return await sendWhatsAppMessage(phone, text);
  } catch {
    return false;
  }
}
