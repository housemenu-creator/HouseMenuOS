/**
 * Telegram Sender — standalone Telegram message sender via Bot API.
 *
 * Unlike the Telegraf-based bot in bot/telegram.ts, this module sends
 * messages directly via the Telegram Bot HTTP API, so it doesn't need
 * a Telegraf context. Used by the scheduler to send notifications.
 */

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: "Markdown" | "HTML"; disablePreview?: boolean },
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN no configurado, no se pudo enviar mensaje");
    return false;
  }

  if (!chatId) {
    console.warn("⚠️ chat_id vacío, no se pudo enviar mensaje");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: parseInt(chatId),
        text,
        parse_mode: options?.parseMode || "Markdown",
        disable_web_page_preview: options?.disablePreview ?? true,
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.warn(`⚠️ Telegram send error: ${data.description}`);
    }
    return data.ok;
  } catch (err) {
    console.error("❌ telegram-sender error:", err);
    return false;
  }
}

/**
 * Sends a simple text message (no markdown) — useful when the text
 * might contain characters that break Markdown parsing.
 */
export async function sendTelegramPlain(chatId: string, text: string): Promise<boolean> {
  return sendTelegramMessage(chatId, text, { parseMode: undefined, disablePreview: true });
}
