import "dotenv/config";
import { createBot } from "./bot/telegram.js";
import { startWhatsApp, getDrainPromise } from "./bot/whatsapp.js";
import { startHttpServer } from "./services/http-server.js";
import { startCocinaWatcher } from "./services/cocina.js";
import { startOrderNotifier } from "./services/orderNotifier.js";
import { startMonitor } from "./services/monitor.js";
import { startScheduler } from "./services/scheduler.js";
import { initFirebase, authenticateBot } from "./lib/firebase.js";
import { reportHeartbeat, reportSystemHealth } from "./lib/telemetry.js";
import { getPrimaryBranchId, getAllBranchIds } from "./lib/branch.js";

const branchId = getPrimaryBranchId();
const allBranchIds = getAllBranchIds();
let telegramBot: ReturnType<typeof createBot> | null = null;

// ── Firebase ──────────────────────────────────────────
try {
  initFirebase();
  await authenticateBot();
} catch (e: any) {
  if (e.message?.includes("Faltan")) {
    console.error("❌ Firebase Auth:", e.message);
  } else {
    console.error("❌ Firebase:", e.message);
  }
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

// ── Order Notifier (WhatsApp status alerts) ────────
const stopOrderNotifier = startOrderNotifier();
console.log("💬 Order Notifier: ✅");

// ── Monitor ─────────────────────────────────────────
const stopMonitor = startMonitor();
console.log("📊 Monitor: ✅");

// ── Task Scheduler ────────────────────────────────────
const stopScheduler = startScheduler();
console.log("⏰ Scheduler: ✅");

// ── Telemetry Heartbeat ───────────────────────────────
const telemetryInterval = setInterval(() => {
  reportHeartbeat("atencion", { messagesToday: 0, toolsExecuted: 0 }).catch(() => {});
  reportHeartbeat("admin", { messagesToday: 0, toolsExecuted: 0 }).catch(() => {});
  reportSystemHealth({ firebase: "ok", openrouter: "ok", uptime: process.uptime() }).catch(() => {});
}, 30000);

// ── Status ─────────────────────────────────────────────
console.log(`\n📡 HousePySbot`);
console.log(`   Sucursales: ${allBranchIds.join(", ")}`);
console.log(`   Primaria: ${branchId}`);
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

  // Stop services
  if (typeof stopCocina === "function") stopCocina();
  if (typeof stopOrderNotifier === "function") stopOrderNotifier();
  if (typeof stopMonitor === "function") stopMonitor();
  if (typeof stopScheduler === "function") stopScheduler();

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
