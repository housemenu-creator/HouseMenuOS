/**
 * Telegram Adapter
 *
 * Encapsulates Telegraf behind the ChannelAdapter interface.
 * Wraps the existing createBot() to preserve inline keyboards, cart, etc.
 */

import type { ChannelAdapter, ChannelAction, SendTextOptions, NormalizedMessage } from "../channel.interface.js";
import { channelRegistry } from "../channel.interface.js";
import { normalizeTelegram } from "../message-normalizer.js";
import { createBot } from "../../bot/telegram.js";
import type { Telegraf } from "telegraf";
import logger from "../../lib/logger.js";

export class TelegramAdapter implements ChannelAdapter {
  readonly channel = "telegram";
  private bot: Telegraf | null = null;
  private token: string;
  private branchId: string = "";

  constructor(token: string) {
    this.token = token;
  }

  async start(branchId: string): Promise<void> {
    this.branchId = branchId;
    this.bot = createBot(this.token, branchId);
    // Fire-and-forget launch — don't block startup
    this.bot.launch().then(() => {
      logger.info("🤖 Telegram: ✅");
    }).catch((e) => {
      logger.error(e, "🤖 Telegram: error al iniciar:");
    });
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
  }

  async sendText(recipientId: string, text: string, options?: SendTextOptions): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.telegram.sendMessage(recipientId, text, {
        parse_mode: options?.parseMode === "html" ? "HTML" : "Markdown",
        ...(options?.buttons ? { reply_markup: { inline_keyboard: this.buildKeyboard(options.buttons) } } : {}),
      });
    } catch {
      // Fallback: strip markdown
      const plain = text
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      await this.bot.telegram.sendMessage(recipientId, plain);
    }
  }

  async sendAction(recipientId: string, action: ChannelAction): Promise<void> {
    if (!this.bot) return;
    if (action === "typing") {
      try { await this.bot.telegram.sendChatAction(recipientId, "typing"); } catch {}
    }
  }

  async sendImage(recipientId: string, imageUrl: string, caption?: string): Promise<void> {
    if (!this.bot) return;
    await this.bot.telegram.sendPhoto(recipientId, imageUrl, { caption });
  }

  private buildKeyboard(buttons: SendTextOptions["buttons"]): any {
    if (!buttons) return undefined;
    return buttons.map((row) =>
      row.map((btn) => {
        if (btn.type === "url") return { text: btn.label, url: btn.url };
        if (btn.type === "callback") return { text: btn.label, callback_data: btn.data };
        return { text: btn.label, callback_data: btn.payload };
      }),
    );
  }
}

/**
 * Hook to call when a Telegram message arrives.
 */
export async function handleTelegramMessage(
  fromId: number,
  text: string,
  messageId?: number,
  username?: string,
): Promise<void> {
  const normalized = normalizeTelegram({ fromId, text, messageId, username });
  await channelRegistry.onMessage(normalized);
}
