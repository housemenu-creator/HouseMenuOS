import "dotenv/config";

export type MessageSource = "telegram" | "whatsapp";

export interface RouteResult {
  agentId: string;
  source: MessageSource;
  chatId?: string;
}

// ── Helpers — read env vars lazily so tests can override ──

function getAdminChatIds(): string[] {
  return (process.env.ADMIN_CHAT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function getAdminPhones(): string[] {
  return (process.env.ADMIN_PHONE || "").split(",").map((s) => s.replace(/[^0-9]/g, "")).filter(Boolean);
}

function getCocinaChatIds(): string[] {
  return (process.env.COCINA_CHAT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function getCocinaPhones(): string[] {
  return (process.env.COCINA_PHONES || "").split(",").map((s) => s.replace(/[^0-9]/g, "")).filter(Boolean);
}

function isAdminTelegram(chatId: string): boolean {
  return getAdminChatIds().includes(chatId);
}

function isAdminWhatsApp(phone: string): boolean {
  return getAdminPhones().includes(phone);
}

function isCocinaTelegram(chatId: string): boolean {
  return getCocinaChatIds().includes(chatId);
}

function isCocinaWhatsApp(phone: string): boolean {
  return getCocinaPhones().includes(phone);
}

// ── Public API ───────────────────────────────────────

export function routeTelegram(chatId: string | number): RouteResult {
  const id = String(chatId);
  if (isAdminTelegram(id)) {
    return { agentId: "admin", source: "telegram", chatId: id };
  }
  if (isCocinaTelegram(id)) {
    return { agentId: "cocina", source: "telegram", chatId: id };
  }
  return { agentId: "atencion", source: "telegram", chatId: id };
}

export function routeWhatsApp(remoteJid: string): RouteResult {
  const senderPhone = remoteJid.split("@")[0].replace(/[^0-9]/g, "");
  if (isAdminWhatsApp(senderPhone)) {
    return { agentId: "admin", source: "whatsapp", chatId: remoteJid };
  }
  if (isCocinaWhatsApp(senderPhone)) {
    return { agentId: "cocina", source: "whatsapp", chatId: remoteJid };
  }
  return { agentId: "atencion", source: "whatsapp", chatId: remoteJid };
}
