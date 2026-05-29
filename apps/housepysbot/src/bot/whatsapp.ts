import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import { processMessage } from "../agent/index.js";
import { getHistory, pushHistory } from "../lib/session.js";
import { qrEmitter } from "../services/http-server.js";
import { checkRateLimit } from "../lib/rateLimit.js";

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR || "./wa_session";

let sock: ReturnType<typeof makeWASocket> | null = null;

// ── Message queue ──────────────────────────────────────

type QueueItem = {
  sender: string;
  text: string;
  branchId: string;
};

const queue: QueueItem[] = [];
let activeCount = 0;
const MAX_CONCURRENCY = 3;

function enqueue(item: QueueItem) {
  queue.push(item);
  processQueue();
}

async function processItem(item: QueueItem) {
  activeCount++;
  try {
    try { await sock?.sendPresenceUpdate("composing", item.sender); } catch {}

    const history = await getHistory(`wa:${item.sender}`);
    const res = await processMessage(item.text, item.branchId, history.slice(-10), "atencion");

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
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("🔄 WhatsApp desconectado, reconectando en 5s...");
        setTimeout(() => startWhatsApp(branchId), 5000);
      } else {
        console.log("❌ WhatsApp: sesión cerrada. Escanea el QR de nuevo.");
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp conectado!");
      qrEmitter.emit("connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const text = extractText(msg.message);
      if (!text) continue;

      const sender = msg.key.remoteJid || "unknown";
      if (!checkRateLimit(sender)) {
        await sock?.sendMessage(sender, { text: "⏳ Espera un momento antes de enviar otro mensaje." });
        continue;
      }

      enqueue({ sender, text, branchId });
    }
  });
}

// ── Helpers ────────────────────────────────────────────

function extractText(msg: any): string | null {
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  return null;
}

export function getWhatsAppStatus(): string {
  const state = sock?.user ? "connected" : "disconnected";
  const number = sock?.user?.id?.split(":")[0] || null;
  return JSON.stringify({ status: state, number });
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
