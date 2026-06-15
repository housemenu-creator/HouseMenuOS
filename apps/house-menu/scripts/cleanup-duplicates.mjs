/**
 * Cleanup duplicate users by email — standalone admin script.
 *
 * Usage:
 *   node scripts/cleanup-duplicates.mjs
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var or .env file.
 * Includes dry-run mode:
 *   node scripts/cleanup-duplicates.mjs --dry-run
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase, ref, get, set, remove } from 'firebase-admin/database';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes('--dry-run');

// ── Firebase Admin Init ──────────────────────────────────

let serviceAccount;
const envPath = resolve(__dirname, '../../.env');

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else if (existsSync(envPath)) {
  // Simple .env loader (no deps)
  const env = Object.fromEntries(
    readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => l.split('=').map(s => s.trim()))
  );
  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }
}

if (!serviceAccount) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found. Set it in .env or env var.');
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getDatabase(app);
const tenantPath = (path) => `tenants/default/${path}`;

// ── Main ─────────────────────────────────────────────────

async function cleanupDuplicates() {
  console.log(isDryRun ? '🔍 DRY RUN — no changes will be made\n' : '🔍 Buscando usuarios duplicados...\n');

  const snap = await get(ref(db, tenantPath('users')));
  const users = snap.val();
  if (!users) {
    console.log('No hay usuarios.');
    return;
  }

  const byEmail = {};
  for (const [id, u] of Object.entries(users)) {
    if (!byEmail[u.email]) byEmail[u.email] = [];
    byEmail[u.email].push({ id, ...u });
  }

  let cleaned = 0;
  for (const [email, list] of Object.entries(byEmail)) {
    if (list.length < 2) continue;
    console.log(`✖ ${email}:`, list.map(u => ({ id: u.id, nombre: u.name, tieneFirebaseUid: !!u.firebaseUid })));

    const withUid = list.find(u => u.firebaseUid);
    const withoutUid = list.find(u => !u.firebaseUid);
    if (withUid && withoutUid) {
      if (isDryRun) {
        console.log(`  → Se mantendría: ${withoutUid.id} (admin), se eliminaría: ${withUid.id} (Google)\n`);
        continue;
      }

      await set(ref(db, tenantPath(`users/${withoutUid.id}/firebaseUid`)), withUid.firebaseUid);
      const memSnap = await get(ref(db, tenantPath('memberships')));
      if (memSnap.val()) {
        for (const [mid, m] of Object.entries(memSnap.val())) {
          if (m.userId === withUid.id) await remove(ref(db, tenantPath(`memberships/${mid}`)));
        }
      }
      await remove(ref(db, tenantPath(`users/${withUid.id}`)));
      cleaned++;
      console.log(`✅ ${email}: se quedó ${withoutUid.id} (admin), se eliminó ${withUid.id} (Google)\n`);
    }
  }

  if (isDryRun) {
    console.log(`\n🎯 Dry-run completo. ${cleaned} duplicado(s) se limpiarían en modo real.`);
  } else {
    console.log(`\n🎯 Listo. ${cleaned} duplicado(s) limpiado(s).`);
  }

  process.exit(0);
}

cleanupDuplicates().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
