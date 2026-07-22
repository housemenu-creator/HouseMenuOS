/**
 * Message Normalizer
 *
 * Converts raw messages from any channel into a unified NormalizedMessage.
 * The conversation engine ONLY works with NormalizedMessage.
 */

import type { NormalizedMessage, MessageType } from "./channel.interface.js";

// ── Normalize ───────────────────────────────────────────

interface RawWhatsAppMessage {
  sender: string;
  text: string;
  messageId?: string;
  type?: MessageType;
  metadata?: Record<string, unknown>;
}

interface RawTelegramMessage {
  fromId: number;
  username?: string;
  text: string;
  messageId?: number;
  type?: MessageType;
  metadata?: Record<string, unknown>;
}

export function normalizeWhatsApp(raw: RawWhatsAppMessage): NormalizedMessage {
  return {
    channel: "whatsapp",
    externalUserId: raw.sender,
    messageId: raw.messageId || `wa-${Date.now()}`,
    text: raw.text,
    type: raw.type || "text",
    metadata: raw.metadata,
  };
}

export function normalizeTelegram(raw: RawTelegramMessage): NormalizedMessage {
  return {
    channel: "telegram",
    externalUserId: String(raw.fromId),
    messageId: raw.messageId ? String(raw.messageId) : `tg-${Date.now()}`,
    text: raw.text,
    type: raw.type || "text",
    metadata: {
      ...raw.metadata,
      username: raw.username,
    },
  };
}

// ── Route to agent ──────────────────────────────────────

/**
 * Derive a conversation key for rate-limiting and history lookup.
 * Format: `{channel}:{externalUserId}:{agentId}`
 */
export function conversationKey(channel: string, externalUserId: string, agentId: string): string {
  return `${channel}:${externalUserId}:${agentId}`;
}
