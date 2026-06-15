/**
 * Entry: HTTP Server only — KDS, QR Menu, Webhooks, Health, MCP API.
 * Runs independently of WhatsApp/Telegram bots.
 *
 * Usage:
 *   npx tsx src/entry/http.ts
 */
import "dotenv/config";
import { initFirebase, authenticateBot } from "../lib/firebase.js";
import { startHttpServer } from "../services/http-server.js";
import { loadTools } from "../mcp/server.js";

const port = parseInt(process.env.PORT || process.env.HTTP_PORT || "3000");

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label} superó ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

async function main() {
  try {
    initFirebase();
    await withTimeout(authenticateBot(), 15_000, "authenticateBot()");
    console.log("🔐 Bot autenticado, HTTP server listo para operaciones con DB");
  } catch (e: any) {
    console.error("❌ Firebase Auth:", e.message);
    process.exit(1);
  }

  loadTools();
  startHttpServer(port);
  console.log(`🌐 HTTP Server: http://localhost:${port}`);
}

main();
