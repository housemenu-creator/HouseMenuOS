import "dotenv/config";

export type MessageSource = "telegram" | "whatsapp";

export interface RouteResult {
  agentId: string;
  source: MessageSource;
  chatId?: string;
}

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";

export function routeTelegram(chatId: string | number): RouteResult {
  const id = String(chatId);
  if (ADMIN_CHAT_ID && id === ADMIN_CHAT_ID) {
    return { agentId: "admin", source: "telegram", chatId: id };
  }
  return { agentId: "atencion", source: "telegram", chatId: id };
}

export function routeWhatsApp(remoteJid: string): RouteResult {
  return { agentId: "atencion", source: "whatsapp", chatId: remoteJid };
}
