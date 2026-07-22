/**
 * WhatsApp Adapter
 *
 * Encapsulates Baileys behind the ChannelAdapter interface.
 * The rest of the system does NOT import Baileys directly.
 */

import type { ChannelAdapter, ChannelAction, SendTextOptions, NormalizedMessage } from "../channel.interface.js";
import { channelRegistry } from "../channel.interface.js";
import { normalizeWhatsApp } from "../message-normalizer.js";
import { startWhatsApp as startBaileys, sendWhatsAppMessage, sendWATyping } from "../../bot/whatsapp.js";
import { setWhatsAppStatus } from "../../lib/wa-status.js";
import logger from "../../lib/logger.js";

export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = "whatsapp";

  async start(branchId: string): Promise<void> {
    await startBaileys(branchId);
    logger.info("💬 WhatsApp: ✅");
  }

  async stop(): Promise<void> {
    // No queue to drain — messages go directly to ChannelRegistry
  }

  async sendText(recipientId: string, text: string, _options?: SendTextOptions): Promise<void> {
    await sendWhatsAppMessage(recipientId, text);
  }

  async sendAction(recipientId: string, action: ChannelAction): Promise<void> {
    if (action === "typing") {
      // WhatsApp typing via presence update (best-effort, rate-limited)
      const jid = `${recipientId.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
      await sendWATyping(jid);
    }
  }

  async sendImage(_recipientId: string, _imageUrl: string, _caption?: string): Promise<void> {
    // WhatsApp adapter doesn't support images yet
    logger.warn("WhatsApp image send not yet implemented");
  }
}

/**
 * Hook to call when a WhatsApp message arrives.
 * The existing whatsapp.ts calls this instead of processMessage directly.
 */
export async function handleWhatsAppMessage(sender: string, text: string, messageId?: string): Promise<void> {
  const normalized = normalizeWhatsApp({ sender, text, messageId });
  await channelRegistry.onMessage(normalized);
}
