/**
 * wa-auth-firebase.ts — WhatsApp session persistence via Firebase RTDB.
 *
 * Strategy:
 *   - creds.json → saved individually on every creds.update (small, fast)
 *   - rest of wa_session/* → saved as gzipped archive periodically (throttled)
 *   - on startup: restore both from Firebase to disk, then useMultiFileAuthState as usual
 *
 * Ponytail: we don't reimplement Baileys' SignalKeyStore. We just persist the
 * files and let useMultiFileAuthState read/write them normally.
 */

import { getDb } from "./firebase.js";
import { ref, get, set } from "firebase/database";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import logger from "./logger.js";

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR || "./wa_session";

// ── Helpers ──────────────────────────────────────────────

function readAllFiles(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { recursive: true }) as string[];
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      if (statSync(full).isFile()) {
        files[entry] = readFileSync(full, "base64");
      }
    } catch { /* skip */ }
  }
  return files;
}

function writeAllFiles(dir: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, Buffer.from(content, "base64"));
  }
}

// ── Public API ───────────────────────────────────────────

/** Restore wa_session from Firebase → disk. Call BEFORE useMultiFileAuthState. */
export async function loadWASession(branchId: string): Promise<boolean> {
  try {
    const snap = await get(ref(getDb(), `wa_session/${branchId}`));
    if (!snap.exists()) {
      logger.info("📁 wa_session: no hay sesión guardada en Firebase.");
      return false;
    }

    const data = snap.val();

    // Restore creds.json (the critical piece)
    if (data.creds) {
      const p = join(SESSION_DIR, "creds.json");
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, JSON.stringify(data.creds, null, 2));
    }

    // Restore remaining session files from compressed archive
    if (data.archive) {
      try {
        const raw = gunzipSync(Buffer.from(data.archive, "base64"));
        writeAllFiles(SESSION_DIR, JSON.parse(raw.toString()));
      } catch (e) {
        logger.warn(e, "📁 wa_session: archive corrupto, sesión puede estar incompleta");
      }
    }

    logger.info("📁 wa_session: restaurado de Firebase ✅");
    return true;
  } catch (e) {
    logger.warn(e, "📁 wa_session: error al cargar desde Firebase");
    return false;
  }
}

/** Save creds.json to Firebase RTDB. Llamar en cada creds.update. */
export async function saveCredsToFirebase(branchId: string): Promise<void> {
  try {
    const p = join(SESSION_DIR, "creds.json");
    if (!existsSync(p)) {
      logger.warn("📁 wa_session: creds.json no existe, no se guarda");
      return;
    }
    const creds = JSON.parse(readFileSync(p, "utf-8"));
    await set(ref(getDb(), `wa_session/${branchId}/creds`), creds);
  } catch (e) {
    logger.warn(e, "📁 wa_session: error al guardar creds en Firebase");
  }
}

/** Archive all session files (except creds.json) to Firebase RTDB. */
export async function saveFullSessionToFirebase(branchId: string): Promise<void> {
  try {
    const files = readAllFiles(SESSION_DIR);
    delete files["creds.json"]; // already saved separately
    if (!Object.keys(files).length) return;

    const buf = gzipSync(Buffer.from(JSON.stringify(files)));
    await set(ref(getDb(), `wa_session/${branchId}/archive`), buf.toString("base64"));
    logger.info(`📁 wa_session: archive → Firebase (${Object.keys(files).length} archivos, ${(buf.length / 1024).toFixed(1)}KB)`);
  } catch (e) {
    logger.warn(e, "📁 wa_session: error al guardar archive en Firebase");
  }
}

/** Start periodic full-session backup. Retorna cleanup fn. */
export function startPeriodicBackup(branchId: string, intervalMs = 60_000): () => void {
  const id = setInterval(() => {
    saveFullSessionToFirebase(branchId).catch(() => {});
  }, intervalMs);
  logger.info(`📁 wa_session: backup automático cada ${intervalMs / 1000}s`);
  return () => clearInterval(id);
}
