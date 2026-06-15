import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import { processMessage, type SenderInfo } from "../agent/index.js";
import { getHistory, pushHistory } from "../lib/session.js";
import { qrEmitter } from "../services/http-server.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { routeWhatsApp } from "../agents/router.js";
import { setWhatsAppStatus } from "../lib/wa-status.js";

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR || "./wa_session";

let sock: ReturnType<typeof makeWASocket> | null = null;

// ── Message queue ──────────────────────────────────────

type QueueItem = {
  sender: string;
  text: string;
  branchId: string;
  agentId: string;
};

const queue: QueueItem[] = [];
let activeCount = 0;
const MAX_CONCURRENCY = parseInt(process.env.WHATSAPP_MAX_CONCURRENCY || "5");

function enqueue(item: QueueItem) {
  queue.push(item);
  processQueue();
}

async function processItem(item: QueueItem) {
  activeCount++;
  try {
    try { await sock?.sendPresenceUpdate("composing", item.sender); } catch {}

    // Extract phone from JID (e.g. "51999888777@s.whatsapp.net" → "51999888777")
    const senderPhone = item.sender.split("@")[0];
    const senderInfo: SenderInfo = { phone: senderPhone, platform: "whatsapp" };

    const history = await getHistory(`wa:${item.sender}:${item.agentId}`);
    const res = await processMessage(item.text, item.branchId, history.slice(-10), item.agentId, senderInfo);

    try { await sock?.sendPresenceUpdate("paused", item.sender); } catch {}

    await sock?.sendMessage(item.sender, { text: res });
    await pushHistory(`wa:${item.sender}`, item.text, res);
  } catch (err) {
    console.error("whatsapp queue error:", err);
    try {
      await sock?.sendMessage(item.sender, { text: "Ocurrió un error. Intenta de nuevo." });
    } catch {}
  } finally {
    activeCount--;
    processQueue();
  }
}

function processQueue() {
  while (queue.length > 0 && activeCount < MAX_CONCURRENCY) {
    const item = queue.shift()!;
    processItem(item);
  }
}

// ── Connection ─────────────────────────────────────────

export async function startWhatsApp(branchId: string): Promise<void> {
  let state, saveCreds;
  try {
    const auth = await useMultiFileAuthState(SESSION_DIR);
    state = auth.state;
    saveCreds = auth.saveCreds;
  } catch (e) {
    console.error("📁 wa_session: error al cargar credenciales:", e);
    throw e;
  }

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" }),
    browser: ["HousePySbot", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrEmitter.emit("qr", qr);
    }
    if (connection === "close") {
      setWhatsAppStatus(false);
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("🔄 WhatsApp desconectado, reconectando en 5s...");
        setTimeout(() => startWhatsApp(branchId), 5000);
      } else {
        console.log("❌ WhatsApp: sesión cerrada. Escanea el QR de nuevo.");
      }
    } else if (connection === "open") {
      const number = sock?.user?.id?.split(":")[0] || "";
      setWhatsAppStatus(true, number);
      console.log("✅ WhatsApp conectado!");
      qrEmitter.emit("connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const sender = msg.key.remoteJid || "unknown";
      const { agentId } = routeWhatsApp(sender);
      const rateKey = `wa:${sender}:${agentId}`;

      // ── Handle non-text media types ──────────────────
      const mediaType = detectMediaType(msg.message);
      if (mediaType !== "text" && mediaType !== "image_caption") {
        const responses: Record<string, string> = {
          image: "📷 Recibí tu imagen. No puedo procesar imágenes todavía. Escribime qué necesitás.",
          voice: "🎤 Recibí tu nota de voz. No puedo procesar audios todavía. Escribime el mensaje.",
          video: "🎬 Recibí tu video. No puedo procesar videos todavía.",
          document: "📄 Recibí tu documento. No puedo procesar documentos todavía.",
          audio: "🎵 Recibí tu audio. No puedo procesar audios todavía. Escribime el mensaje.",
          sticker: "", // silent ignore stickers
        };
        const reply = responses[mediaType];
        if (reply) {
          await sock?.sendMessage(sender, { text: reply });
        }
        continue;
      }

      const text = extractText(msg.message);
      if (!text) continue;

      if (!checkRateLimit(rateKey)) {
        await sock?.sendMessage(sender, { text: "⏳ Espera un momento antes de enviar otro mensaje." });
        continue;
      }
      enqueue({ sender, text, branchId, agentId });
    }
  });
}

// ── Helpers ────────────────────────────────────────────

type MediaType = "text" | "image" | "image_caption" | "voice" | "video" | "document" | "audio" | "sticker";

function detectMediaType(msg: any): MediaType {
  if (msg.conversation || msg.extendedTextMessage) return "text";
  if (msg.imageMessage?.caption) return "image_caption";
  if (msg.imageMessage) return "image";
  if (msg.voiceMessage) return "voice";
  if (msg.videoMessage) return "video";
  if (msg.documentMessage) return "document";
  if (msg.audioMessage) return "audio";
  if (msg.stickerMessage) return "sticker";
  return "text"; // fallback
}

function extractText(msg: any): string | null {
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  return null;
}

export { getWhatsAppStatus } from "../lib/wa-status.js";

export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  if (!sock) {
    console.warn("⚠️ WhatsApp no conectado, no se pudo enviar mensaje a", to);
    return false;
  }
  try {
    // Normalize phone: remove +, spaces, ensure JID format
    const phone = to.replace(/[^0-9]/g, "");
    if (phone.length < 10) return false;
    const jid = `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return true;
  } catch (err) {
    console.error("❌ sendWhatsAppMessage error:", err);
    return false;
  }
}

export function getDrainPromise(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (queue.length === 0 && activeCount === 0) return resolve();
      setTimeout(check, 100);
    };
    check();
  });
}
