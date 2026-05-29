import "dotenv/config";
import { createBot } from "./bot/telegram.js";
import { startWhatsApp, getDrainPromise } from "./bot/whatsapp.js";
import { startHttpServer } from "./services/http-server.js";
import { startCocinaWatcher } from "./services/cocina.js";
import { startMonitor } from "./services/monitor.js";
import { initFirebase } from "./lib/firebase.js";
import { reportHeartbeat, reportSystemHealth } from "./lib/telemetry.js";

const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || process.env.CHALY_BRANCH_ID || process.env.VITE_HOUSEPYSBOT_BRANCH_ID || "default";
let telegramBot: ReturnType<typeof createBot> | null = null;

// ── Firebase ──────────────────────────────────────────
try {
  initFirebase();
} catch (e: any) {
  console.error("❌ Firebase:", e.message);
  console.error("Configura las variables de Firebase en el .env");
  process.exit(1);
}

// ── Telegram ──────────────────────────────────────────
if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramBot = createBot(process.env.TELEGRAM_BOT_TOKEN, branchId);
  telegramBot.launch().then(() => {
    console.log("🤖 Telegram: ✅");
  }).catch((e) => {
    console.error("🤖 Telegram: error al iniciar:", e);
  });
} else {
  console.log("🤖 Telegram: ❌ (sin TELEGRAM_BOT_TOKEN)");
}

// ── HTTP Server (QR UI + API) ────────────────────────
const httpPort = parseInt(process.env.PORT || process.env.HTTP_PORT || "3000");
startHttpServer(httpPort);

// ── WhatsApp ───────────────────────────────────────────
if (process.env.WHATSAPP_ENABLED === "true") {
  startWhatsApp(branchId)
    .then(() => {
      console.log("💬 WhatsApp: iniciado");
    })
    .catch((e) => {
      console.error("💬 WhatsApp: error al iniciar:", e);
    });
} else {
  console.log("💬 WhatsApp: ❌ (WHATSAPP_ENABLED=false o no configurado)");
}

// ── Cocina Watcher ──────────────────────────────────
const stopCocina = startCocinaWatcher();
console.log("🍳 Cocina Watcher: ✅");

// ── Monitor ─────────────────────────────────────────
const stopMonitor = startMonitor();
console.log("📊 Monitor: ✅");

// ── Telemetry Heartbeat ───────────────────────────────
const telemetryInterval = setInterval(() => {
  reportHeartbeat("atencion", { messagesToday: 0, toolsExecuted: 0 }).catch(() => {});
  reportHeartbeat("admin", { messagesToday: 0, toolsExecuted: 0 }).catch(() => {});
  reportSystemHealth({ firebase: "ok", openrouter: "ok", uptime: process.uptime() }).catch(() => {});
}, 30000);

// ── Status ─────────────────────────────────────────────
console.log(`\n📡 HousePySbot — Branch: ${branchId}`);
console.log(`   Modelo: ${process.env.OPENROUTER_MODEL || "openrouter/free"}`);

// ── Graceful shutdown ──────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n⏳ Recibido ${signal}, cerrando...`);

  // Clear telemetry interval
  clearInterval(telemetryInterval);

  // Drain WhatsApp queue
  try {
    await getDrainPromise();
  } catch (e) {
    console.warn("Drain timeout:", e);
  }

  // Stop cocina watcher and monitor
  if (typeof stopCocina === "function") stopCocina();
  if (typeof stopMonitor === "function") stopMonitor();

  // Stop Telegram
  if (telegramBot) {
    try {
      await telegramBot.stop(signal);
    } catch (e) {
      console.warn("Telegram stop error:", e);
    }
  }

  console.log("👋 HousePySbot cerrado.");
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
