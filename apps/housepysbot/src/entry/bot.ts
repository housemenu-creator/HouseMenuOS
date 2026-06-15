/**
 * Entry: Bot services only — WhatsApp + Telegram + Cocina Watcher + Order Notifier + Monitor.
 * Runs independently of the HTTP server.
 *
 * Usage:
 *   npx tsx src/entry/bot.ts
 */
import "dotenv/config";
import { createBot } from "../bot/telegram.js";
import { startWhatsApp } from "../bot/whatsapp.js";
import { startCocinaWatcher } from "../services/cocina.js";
import { startOrderNotifier } from "../services/orderNotifier.js";
import { startMonitor } from "../services/monitor.js";
import { startScheduler } from "../services/scheduler.js";
import { initFirebase, authenticateBot } from "../lib/firebase.js";
import { getPrimaryBranchId, getAllBranchIds } from "../lib/branch.js";

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
  // Firebase — must auth before any watchers/startups
  try {
    initFirebase();
    await withTimeout(authenticateBot(), 15_000, "authenticateBot()");
    console.log("🔐 Bot autenticado, servicios listos para operaciones con DB");
  } catch (e: any) {
    console.error("❌ Firebase:", e.message);
    process.exit(1);
  }

  // Telegram
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = createBot(process.env.TELEGRAM_BOT_TOKEN, branchId);
    bot.launch().then(() => {
      console.log("🤖 Telegram: ✅");
    }).catch((e) => {
      console.error("🤖 Telegram:", e);
    });
  } else {
    console.log("🤖 Telegram: ❌ (sin TELEGRAM_BOT_TOKEN)");
  }

  // WhatsApp
  if (process.env.WHATSAPP_ENABLED === "true") {
    startWhatsApp(branchId).then(() => {
      console.log("💬 WhatsApp: iniciado");
    }).catch((e) => {
      console.error("💬 WhatsApp:", e);
    });
  } else {
    console.log("💬 WhatsApp: ❌ (WHATSAPP_ENABLED=false)");
  }

  // Watchers
  startCocinaWatcher();
  startOrderNotifier();
  startMonitor();

  // Task Scheduler
  stopScheduler = startScheduler();
  console.log("⏰ Scheduler: ✅");

  console.log(`📡 HousePySbot Bots — ${allBranchIds.join(", ")}`);
}

// ── Graceful shutdown ──────────────────────────────────
process.once("SIGINT", () => {
  console.log("\n⏳ Cerrando...");
  if (stopScheduler) stopScheduler();
  process.exit(0);
});
process.once("SIGTERM", () => {
  if (stopScheduler) stopScheduler();
  process.exit(0);
});

main();
