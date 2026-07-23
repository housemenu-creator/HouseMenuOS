import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from "fs";
import { join } from "path";
import { qrEmitter } from "../services/http-server.js";
import { setWhatsAppStatus } from "../lib/wa-status.js";
import { normalizeWhatsApp } from "../channels/message-normalizer.js";
import { channelRegistry } from "../channels/channel.interface.js";
import { loadWASession, saveCredsToFirebase, saveFullSessionToFirebase, startPeriodicBackup } from "../lib/wa-auth-firebase.js";
import logger from "../lib/logger.js";

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR || "./wa_session";
const BACKUP_DIR = join(SESSION_DIR, "..", "wa_session_backups");

// ── Session backup (antes de conectar) ─────────────────
function backupSession(): void {
  if (!existsSync(SESSION_DIR)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = join(BACKUP_DIR, ts);
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
    cpSync(SESSION_DIR, dest, { recursive: true, errorOnExist: false });
    logger.info(`💾 Sesión respaldada → wa_session_backups/${ts}`);
  } catch (e) {
    logger.warn("⚠️ No se pudo respaldar wa_session:", (e as Error).message);
  }

  // Limpiar backups viejos (>7 días), mantener últimos 10
  try {
    const entries = existsSync(BACKUP_DIR)
      ? readdirSync(BACKUP_DIR).filter((n) => /^\d/.test(n)).sort()
      : [];
    if (entries.length > 10) {
      const cutoff = Date.now() - 7 * 86400_000;
      for (const name of entries.slice(0, entries.length - 10)) {
        const dir = join(BACKUP_DIR, name);
        try {
          const s = statSync(dir);
          if (s.isDirectory() && s.mtimeMs < cutoff) {
            rmSync(dir, { recursive: true, force: true });
          }
        } catch {}
      }
    }
  } catch {}
}

let sock: ReturnType<typeof makeWASocket> | null = null;

// Startup timestamp: filtrar mensajes previos al arranque (evita replay)
const startupTs = Math.floor(Date.now() / 1000);

// ── Watchdog de reconexión ─────────────────────────────
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let waBranchId: string = "monteverde";
let stopBackup: (() => void) | null = null;
const MAX_RECONNECT = 10;

function scheduleReconnect(branchId: string) {
  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT) {
    logger.info(`❌ WhatsApp: ${MAX_RECONNECT} intentos fallidos. Esperando QR manual...`);
    setWhatsAppStatus(false);
    return;
  }
  // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, max 300s
  const delay = Math.min(5 * Math.pow(2, reconnectAttempts - 1), 300) * 1000;
  if (reconnectAttempts === 1 || reconnectAttempts % 5 === 0) {
    logger.info(`🔄 WhatsApp reconexión #${reconnectAttempts} en ${Math.round(delay / 1000)}s...`);
  }
  reconnectTimer = setTimeout(() => startWhatsApp(branchId), delay);
}

function resetWatchdog() {
  reconnectAttempts = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// ── Connection ─────────────────────────────────────────

export async function startWhatsApp(branchId: string): Promise<void> {
  waBranchId = branchId;
  backupSession();
  await loadWASession(branchId);
  let state, saveCreds;
  try {
    const auth = await useMultiFileAuthState(SESSION_DIR);
    state = auth.state;
    const ogSave = auth.saveCreds;
    saveCreds = async () => {
      await ogSave();
      await saveCredsToFirebase(branchId).catch(() => {});
    };
  } catch (e) {
    logger.error(e, "📁 wa_session: error al cargar credenciales:");
    throw e;
  }

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }), // Baileys internal noise disabled — we handle errors explicitly
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
      const reason = (lastDisconnect?.error as any)?.message || (lastDisconnect?.error as any)?.toString() || "desconocido";
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      if (!shouldReconnect) {
        logger.info("❌ WhatsApp: sesión cerrada. Escanea el QR de nuevo.");
        resetWatchdog();
        if (stopBackup) { stopBackup(); stopBackup = null; }
        return;
      }
      scheduleReconnect(branchId);
    } else if (connection === "open") {
      resetWatchdog();
      const number = sock?.user?.id?.split(":")[0] || "";
      setWhatsAppStatus(true, number);
      logger.info("✅ WhatsApp conectado!");
      qrEmitter.emit("connected");

      // Firebase persistence: backup periódico
      if (stopBackup) stopBackup();
      stopBackup = startPeriodicBackup(branchId);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;
      // Ignorar mensajes anteriores al startup (replay de sesión)
      const msgTs = typeof (msg as any).messageTimestamp === "number" ? (msg as any).messageTimestamp : 0;
      if (msgTs > 0 && msgTs < startupTs) continue;
      // Ignorar grupos (@g.us) y broadcasts (@broadcast)
      const jid = msg.key.remoteJid || "";
      if (jid.endsWith("@g.us") || jid.endsWith("@broadcast")) continue;

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
          try { await sock?.sendMessage(jid, { text: reply }); } catch {}
        }
        continue;
      }

      const text = extractText(msg.message);
      if (!text) continue;

      // Enrutar por el ChannelRegistry (Message Router unificado)
      const messageId = msg.key.id || undefined;
      const normalized = normalizeWhatsApp({ sender: jid, text, messageId });
      await channelRegistry.onMessage(normalized);
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

/** Enviar indicador de typing a un chat de WhatsApp */
export async function sendWATyping(jid: string): Promise<void> {
  try {
    await sock?.sendPresenceUpdate("composing", jid);
  } catch {}
}

export { getWhatsAppStatus } from "../lib/wa-status.js";

export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  if (!sock) {
    logger.warn(to, "⚠️ WhatsApp no conectado, no se pudo enviar mensaje a");
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
    logger.error(err, "❌ sendWhatsAppMessage error:");
    return false;
  }
}

/**
 * Clean shutdown: stop periodic backup + save full session to Firebase.
 * Call from the adapter's stop() or from SIGTERM handlers.
 */
export async function stopWhatsApp(): Promise<void> {
  if (stopBackup) { stopBackup(); stopBackup = null; }
  await saveFullSessionToFirebase(waBranchId).catch(() => {});
  logger.info("💤 WhatsApp: backup final guardado en Firebase");
}

/** @deprecated Cola eliminada — los mensajes van directo al ChannelRegistry */
