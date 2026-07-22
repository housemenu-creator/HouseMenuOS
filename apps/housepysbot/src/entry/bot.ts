/**
 * Entry: Bot services only — WhatsApp + Telegram + Cocina Watcher + Order Notifier + Monitor.
 * Runs independently of the HTTP server.
 *
 * Usage:
 *   npx tsx src/entry/bot.ts
 *
 * Architecture:
 *   Each channel is a ChannelAdapter behind a common interface.
 *   Incoming messages → MessageNormalizer → ChannelRegistry → Conversation Engine
 *   Outgoing responses ← ChannelAdapter ← ChannelRegistry
 */
import "dotenv/config";
import { channelRegistry } from "../channels/channel.interface.js";
import { WhatsAppAdapter } from "../channels/whatsapp/whatsapp.adapter.js";
import { TelegramAdapter } from "../channels/telegram/telegram.adapter.js";
import { setupMessageHandler } from "../messaging/message-router.js";
import { startCocinaWatcher } from "../services/cocina.js";
import { startOrderNotifier } from "../services/orderNotifier.js";
import { startMonitor } from "../services/monitor.js";
import { startScheduler } from "../services/scheduler.js";
import { initFirebase, authenticateBot } from "../lib/firebase.js";
import { getPrimaryBranchId, getAllBranchIds } from "../lib/branch.js";
import logger from "../lib/logger.js";

const branchId = getPrimaryBranchId();
const allBranchIds = getAllBranchIds();
let stopScheduler: (() => void) | null = null;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label} superó ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

async function main() {
  // ── Firebase ────────────────────────────────────────
  try {
    initFirebase();
    await withTimeout(authenticateBot(), 15_000, "authenticateBot()");
    logger.info("🔐 Bot autenticado, servicios listos para operaciones con DB");
  } catch (e: any) {
    logger.error(e.message, "❌ Firebase:");
    process.exit(1);
  }

  // ── Set up message handler (conversation engine) ───
  setupMessageHandler();

  // ── Register channel adapters ────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN) {
    channelRegistry.register(new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN));
    logger.info("🤖 Telegram: registrado");
  } else {
    logger.info("🤖 Telegram: ❌ (sin TELEGRAM_BOT_TOKEN)");
  }

  if (process.env.WHATSAPP_ENABLED === "true") {
    channelRegistry.register(new WhatsAppAdapter());
    logger.info("💬 WhatsApp: registrado");
  } else {
    logger.info("💬 WhatsApp: ❌ (WHATSAPP_ENABLED=false)");
  }

  // ── Start all channel adapters ───────────────────────
  await channelRegistry.startAll(branchId);

  // ── Watchers ─────────────────────────────────────────
  startCocinaWatcher();
  startOrderNotifier();
  startMonitor();

  // ── Task Scheduler ──────────────────────────────────
  stopScheduler = startScheduler();
  logger.info("⏰ Scheduler: ✅");

  logger.info(`📡 HousePySbot Bots — ${allBranchIds.join(", ")}`);
}

// ── Graceful shutdown ──────────────────────────────────
process.once("SIGINT", () => {
  logger.info("\n⏳ Cerrando...");
  if (stopScheduler) stopScheduler();
  channelRegistry.stopAll();
  process.exit(0);
});
process.once("SIGTERM", () => {
  if (stopScheduler) stopScheduler();
  channelRegistry.stopAll();
  process.exit(0);
});

main();
