import "dotenv/config";
import { channelRegistry } from "./channels/channel.interface.js";
import { WhatsAppAdapter } from "./channels/whatsapp/whatsapp.adapter.js";
import { TelegramAdapter } from "./channels/telegram/telegram.adapter.js";
import { setupMessageHandler } from "./messaging/message-router.js";
import { startHttpServer } from "./services/http-server.js";
import { startCocinaWatcher } from "./services/cocina.js";
import { startOrderNotifier } from "./services/orderNotifier.js";
import { startMonitor } from "./services/monitor.js";
import { startScheduler } from "./services/scheduler.js";
import { initFirebase, authenticateBot } from "./lib/firebase.js";
import { reportHeartbeat, reportSystemHealth } from "./lib/telemetry.js";
import { getPrimaryBranchId, getAllBranchIds } from "./lib/branch.js";
import { syncBranchKnowledge, startKnowledgeListener } from "./rag/syncFirebase.js";
import logger from "./lib/logger.js";

const branchId = getPrimaryBranchId();
const allBranchIds = getAllBranchIds();
let stopScheduler: (() => void) | null = null;

// ── Firebase ──────────────────────────────────────────
try {
  initFirebase();
  await authenticateBot();
} catch (e: any) {
  if (e.message?.includes("Faltan")) {
    logger.error(e.message, "❌ Firebase Auth:");
  } else {
    logger.error(e.message, "❌ Firebase:");
  }
  logger.error("Configura las variables de Firebase en el .env");
  process.exit(1);
}

// ── Message Router ────────────────────────────────────
setupMessageHandler();

// ── Register channels ─────────────────────────────────
if (process.env.TELEGRAM_BOT_TOKEN) {
  channelRegistry.register(new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN));
}
if (process.env.WHATSAPP_ENABLED === "true") {
  channelRegistry.register(new WhatsAppAdapter());
}

// ── Start channels ────────────────────────────────────
await channelRegistry.startAll(branchId);

// ── HTTP Server (QR UI + API) ────────────────────────
const httpPort = parseInt(process.env.PORT || process.env.HTTP_PORT || "3000");
startHttpServer(httpPort);

// ── Cocina Watcher ──────────────────────────────────
startCocinaWatcher();
logger.info("🍳 Cocina Watcher: ✅");

// ── Order Notifier ──────────────────────────────────
startOrderNotifier();
logger.info("💬 Order Notifier: ✅");

// ── Monitor ─────────────────────────────────────────
startMonitor();
logger.info("📊 Monitor: ✅");

// ── Task Scheduler ────────────────────────────────────
stopScheduler = startScheduler();
logger.info("⏰ Scheduler: ✅");

// ── Telemetry Heartbeat ───────────────────────────────
const telemetryInterval = setInterval(() => {
  reportHeartbeat("atencion", { messagesToday: 0, toolsExecuted: 0 }).catch(() => {});
  reportHeartbeat("admin", { messagesToday: 0, toolsExecuted: 0 }).catch(() => {});
  reportSystemHealth({ firebase: "ok", openrouter: "ok", uptime: process.uptime() }).catch(() => {});
}, 30000);

// ── Status ─────────────────────────────────────────────
logger.info(`\n📡 HousePySbot`);
logger.info(`   Sucursales: ${allBranchIds.join(", ")}`);
logger.info(`   Primaria: ${branchId}`);
logger.info(`   Modelo: ${process.env.OPENROUTER_MODEL || "openrouter/free"}`);

// ── RAG: Sync knowledge base + live listener ───────────
(async () => {
  for (const bId of allBranchIds) {
    try {
      const result = await syncBranchKnowledge(bId);
      startKnowledgeListener(bId); // ponytail: live sync on knowledge doc changes
      logger.info(`   🧠 RAG: ${result.total} docs sync'd + live listener for ${bId}`);
    } catch (e: any) {
      logger.warn(`   ⚠️ RAG sync failed for ${bId}: ${e.message}`);
    }
  }
})();

// ── Graceful shutdown ──────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`\n⏳ Recibido ${signal}, cerrando...`);
  clearInterval(telemetryInterval);
  if (typeof stopScheduler === "function") stopScheduler();
  await channelRegistry.stopAll();
  logger.info("👋 HousePySbot cerrado.");
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
