/**
 * Migrate legacy branch-scoped employees & attendance into tenant-scoped records.
 *
 * What it does:
 *  1. Backfill `userId` on branches/{branch}/employees/{pushId} by linking to
 *     tenants/{tid}/employees/{uid} (match by email, then by name+role if email missing).
 *  2. Copy branches/{branch}/attendance/{pushId}/{date} → tenants/{tid}/employees/{uid}/attendance/{date}
 *     converting legacy ISO format to the modern epoch format ({ state, clockIn, clockOut, ... }).
 *     Merge-by-date: never overwrites an existing tenant record, fills gaps only.
 *  3. Rebuild pin_lookup index for tenant employees that carry a plaintext pin or
 *     an existing pinLookupKey (hash-only employees are indexed on first login).
 *
 * Usage:
 *   node scripts/migrate-employees.mjs --self-test   # run checks (no Firebase needed)
 *   node scripts/migrate-employees.mjs               # dry run (reports only)
 *   node scripts/migrate-employees.mjs --apply       # writes
 *
 * Requires BOT_FIREBASE_EMAIL / BOT_FIREBASE_PASSWORD (and FIREBASE_DATABASE_URL / keys)
 * in .env — same auth path as housepysbot (web SDK, no admin service account needed).
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { hashPin, verifyPinHash, pinLookupKey } from '../src/lib/crypto.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isApply = process.argv.includes('--apply');

// ── Env ─────────────────────────────────────────────────

const envPath = resolve(__dirname, '../../../.env'); // monorepo root (bot creds)
const appEnvPath = resolve(__dirname, '../.env');     // house-menu app (.env, VITE_*)
const prodEnvPath = resolve(__dirname, '../.env.production'); // same priority as Vite prod build
const envVars = {};
function loadEnv(p) {
  if (!existsSync(p)) return;
  Object.assign(envVars, Object.fromEntries(
    readFileSync(p, 'utf-8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => l.split('=').map(s => s.trim()))
  ));
}
loadEnv(envPath);
loadEnv(appEnvPath);     // app wins on conflicts (VITE_ENCRYPTION_PEPPER)
loadEnv(prodEnvPath);    // prod build env wins last, like Vite does in production
const appEnv = (name) => process.env[name] || envVars[name];

// ── Helpers (pure — exported for self-test) ─────────────

/** Legacy branch attendance record → modern tenant record shape. */
export function toModernAttendance(legacy, date) {
  const clockIn = typeof legacy.clockIn === 'number' ? legacy.clockIn : Date.parse(legacy.clockIn || '');
  const clockOut = legacy.clockOut ? (typeof legacy.clockOut === 'number' ? legacy.clockOut : Date.parse(legacy.clockOut)) : null;
  if (!clockIn || Number.isNaN(clockIn)) return null;
  const record = {
    state: clockOut ? 'completed' : 'active',
    clockIn,
    clockOut,
    date,
  };
  if (legacy.area) record.area = legacy.area;
  if (legacy.station) record.station = legacy.station;
  if (legacy.timeline) record.timeline = legacy.timeline;
  return record;
}

/**
 * PIN handling uses the app's REAL crypto.js (hashPin/verifyPinHash/pinLookupKey)
 * so hashes and lookup keys match what authService writes. crypto.js reads the
 * pepper from process.env.VITE_ENCRYPTION_PEPPER — set it from .env in main().
 */

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

async function selfTest() {
  // ISO string legacy → epoch modern
  const r = toModernAttendance({ clockIn: '2026-06-13T12:00:00.000Z', clockOut: '2026-06-13T20:00:00.000Z', status: 'presente' }, '2026-06-13');
  assert.strictEqual(r.state, 'completed');
  assert.strictEqual(r.clockIn, Date.parse('2026-06-13T12:00:00.000Z'));
  assert.strictEqual(r.clockOut, Date.parse('2026-06-13T20:00:00.000Z'));
  // Open shift → active
  const open = toModernAttendance({ clockIn: '2026-06-14T09:00:00.000Z' }, '2026-06-14');
  assert.strictEqual(open.state, 'active');
  assert.strictEqual(open.clockOut, null);
  // Unparseable → null
  assert.strictEqual(toModernAttendance({ clockIn: 'nope' }, '2026-06-14'), null);
  // Already epoch numbers pass through
  const epoch = toModernAttendance({ clockIn: 123456, clockOut: 234567 }, '2026-06-14');
  assert.strictEqual(epoch.clockIn, 123456);
  // Lookup key deterministic + hex sha-256 (real crypto.js)
  const k1 = await pinLookupKey('1234');
  const k2 = await pinLookupKey('1234');
  assert.strictEqual(k1, k2);
  assert.match(k1, /^[a-f0-9]{64}$/);
  // hashPin + verifyPinHash roundtrip (real crypto.js)
  const h = await hashPin('4321');
  assert.strictEqual(await verifyPinHash('4321', h), true);
  assert.strictEqual(await verifyPinHash('9999', h), false);
  console.log('✅ self-test OK');
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const serverUrl = appEnv('FIREBASE_DATABASE_URL') || appEnv('VITE_FIREBASE_DATABASE_URL');
  const botEmail = appEnv('BOT_FIREBASE_EMAIL');
  const botPassword = appEnv('BOT_FIREBASE_PASSWORD');
  if (!serverUrl || !botEmail || !botPassword) {
    console.error('❌ Faltan .env: BOT_FIREBASE_EMAIL, BOT_FIREBASE_PASSWORD, FIREBASE_DATABASE_URL.');
    process.exit(1);
  }

  const firebaseApp = initializeApp({
    apiKey: appEnv('FIREBASE_API_KEY') || '',
    authDomain: appEnv('FIREBASE_AUTH_DOMAIN') || '',
    databaseURL: serverUrl,
    projectId: appEnv('FIREBASE_PROJECT_ID') || '',
  });
  try {
    await signInWithEmailAndPassword(getAuth(firebaseApp), botEmail, botPassword);
    console.log('🔐 Autenticado como bot');
  } catch (e) {
    console.warn('⚠️ Auth falló, continúo sin auth:', e.message || e);
  }
  const db = getDatabase(firebaseApp);
  const getVal = async (path) => {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
  };

  console.log(isApply ? '🚀 Aplicando migración…' : '🔍 DRY RUN — no se escribirá nada\n');

  // 1. All tenants + branches
  const tenants = (await getVal('tenants')) || {};
  const branches = (await getVal('branches')) || {};
  console.log(`Tenants: ${Object.keys(tenants).length}, Branches: ${Object.keys(branches).length}\n`);

  if (process.argv.includes('--dump')) {
    for (const [branchId, branch] of Object.entries(branches)) {
      console.log(`[branch ${branchId}] employees:`);
      for (const [pushId, emp] of Object.entries(branch.employees || {})) {
        console.log(`  ${pushId}: name=${emp.name || '—'} role=${emp.role || '—'} email=${emp.email || emp.profile?.email || '—'} userId=${emp.userId || '—'}`);
      }
    }
    for (const [tid, tenant] of Object.entries(tenants)) {
      console.log(`[tenant ${tid}] employees:`);
      for (const [uid, emp] of Object.entries(tenant.employees || {})) {
        console.log(`  ${uid}: name=${emp.name || emp.profile?.name || '—'} role=${emp.role || '—'} email=${emp.email || emp.profile?.email || '—'}`);
      }
    }
    process.exit(0);
  }

  const writes = []; // { path, value } — batched later
  let linked = 0, linkedByEmail = 0, attendanceMigrated = 0, indexFixed = 0, created = 0, pinsAssigned = 0, skipped = 0;

  for (const [branchId, branch] of Object.entries(branches)) {
    const branchEmployees = branch.employees || {};
    const legacyAttendance = branch.attendance || {};

    for (const [pushId, emp] of Object.entries(branchEmployees)) {
      // Already linked and exists in tenant?
      if (emp.userId) {
        const empTenant = await getVal(`tenants/default/employees/${emp.userId}`);
        if (empTenant) continue;
        console.log(`  ✎ [${branchId}] ${emp.name || pushId}: userId ${emp.userId} no existe en tenant, re-linkeando`);
      }

      // Find match in default tenant by email, else by name+role
      const tenantEmps = tenants.default?.employees || {};
      let match = null;
      let uid = null;
      const email = normEmail(emp.email || emp.profile?.email);
      if (email) {
        match = Object.entries(tenantEmps).find(([, t]) => normEmail(t.email || t.profile?.email) === email) || null;
        if (match) linkedByEmail++;
      }
      if (!match && emp.name) {
        match = Object.entries(tenantEmps).find(([, t]) =>
          (t.name || t.profile?.name) === emp.name && (t.role === emp.role || !emp.role)
        ) || null;
      }

      if (match) {
        [uid] = match;
      } else {
        // No existe contraparte tenant → create placeholder (user fixes data later)
        const slug = (emp.name || pushId).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        writes.push({
          path: `tenants/default/employees/${pushId}`,
          value: {
            name: emp.name || 'Sin nombre',
            role: emp.role || '',
            email: `${slug}@pendiente.local`,
            profile: { name: emp.name || 'Sin nombre', role: emp.role || '' },
            source: 'branch-migration',
          },
        });
        created++;
        console.log(`  + [${branchId}] ${emp.name || pushId}: creado placeholder en tenant (uid=${pushId}, email pendiente)`);
        // fall through: same pushId becomes the uid, attendance migrates below
        uid = pushId;
      }

      // Backfill userId link on branch employee
      writes.push({ path: `branches/${branchId}/employees/${pushId}/userId`, value: uid });
      linked++;

      // Migrate this employee's legacy attendance
      for (const [date, legacyRec] of Object.entries(legacyAttendance[pushId] || {})) {
        const modern = toModernAttendance(legacyRec, date);
        if (!modern) { skipped++; continue; }
        const target = `tenants/default/employees/${uid}/attendance/${date}`;
        const existing = await getVal(target);
        if (existing) {
          // Merge: keep the modern record, only fill gaps (clockOut/state/clockIn)
          const cur = { ...existing };
          let changed = false;
          if (!cur.clockOut && modern.clockOut) { cur.clockOut = modern.clockOut; changed = true; }
          if (!cur.state && modern.state) { cur.state = modern.state; changed = true; }
          if (!cur.clockIn && modern.clockIn) { cur.clockIn = modern.clockIn; changed = true; }
          if (changed) {
            writes.push({ path: target, value: cur });
            attendanceMigrated++;
          }
          continue;
        }
        writes.push({ path: target, value: modern });
        attendanceMigrated++;
      }
      // Keep branch attendance as-is (no data loss). Cleanup optional later.
    }
  }

  // 3. PIN migration: branch plaintext pin → tenant pinHash + pin_lookup index
  //    (login is O(1) via tenants/{tid}/pin_lookup; index must match the app's crypto.js)
  process.env.VITE_ENCRYPTION_PEPPER = appEnv('VITE_ENCRYPTION_PEPPER') || '';
  for (const [branchId, branch] of Object.entries(branches)) {
    for (const [pushId, emp] of Object.entries(branch.employees || {})) {
      const pin = emp.pin || emp.profile?.pin;
      const uid = emp.userId;
      if (!pin || !uid) continue;
      const tenantEmp = tenants.default?.employees?.[uid];
      if (!tenantEmp) continue; // placeholder sin pin (lo carga el dueño)

      const storedHash = tenantEmp.profile?.pinHash;
      if (storedHash) {
        // Ya tiene hash: verificamos que el pin del branch SIGA siendo el correcto.
        const ok = await verifyPinHash(String(pin), storedHash);
        if (ok && !tenantEmp.profile?.pinLookupKey) {
          const key = await pinLookupKey(String(pin));
          writes.push({ path: `tenants/default/pin_lookup/${key}`, value: uid });
          writes.push({ path: `tenants/default/employees/${uid}/profile/pinLookupKey`, value: key });
          indexFixed++;
        } else if (!ok) {
          console.log(`  ⚠ [${branchId}] ${tenantEmp.profile?.name || uid}: pin branch ≠ pinHash tenant, no toco`);
        }
        continue;
      }
      // Sin hash: migramos el pin branch → hash + índice
      const hash = await hashPin(String(pin));
      const key = await pinLookupKey(String(pin));
      writes.push({ path: `tenants/default/employees/${uid}/profile/pinHash`, value: hash });
      writes.push({ path: `tenants/default/employees/${uid}/profile/pinLookupKey`, value: key });
      writes.push({ path: `tenants/default/pin_lookup/${key}`, value: uid });
      indexFixed++;
    }
  }

  // 4. Unique PINs: fix duplicates + assign missing (login is O(1) per PIN)
  const kept = new Map(); // pin -> uid (first owner keeps it)
  const needy = [];
  const finalPinByUid = new Map(); // uid -> final pin
  for (const [branchId, branch] of Object.entries(branches)) {
    for (const [pushId, emp] of Object.entries(branch.employees || {})) {
      const uid = emp.userId;
      const tenantEmp = uid && tenants.default?.employees?.[uid];
      if (!tenantEmp) continue;
      const pin = String(emp.pin || emp.profile?.pin || '');
      if (pin && !kept.has(pin)) { kept.set(pin, uid); finalPinByUid.set(uid, pin); continue; }
      needy.push({ branchId, pushId, uid });
    }
  }

  if (needy.length) {
    let next = 1234;
    const used = new Set(kept.keys());
    const assigned = [];
    for (const n of needy) {
      while (used.has(String(next))) next++;
      const newPin = String(next);
      used.add(newPin);
      assigned.push({ ...n, newPin });
      next++;
    }
    for (const { branchId, pushId, uid, newPin } of assigned) {
      writes.push({ path: `branches/${branchId}/employees/${pushId}/pin`, value: newPin });
      finalPinByUid.set(uid, newPin);
      pinsAssigned++;
      const name = tenants.default.employees[uid]?.profile?.name || uid;
      console.log(`  🔑 ${newPin} → ${name}`);
    }
  }
  const finalKeys = new Map(); // key -> uid
  for (const [uid, pin] of finalPinByUid) {
    finalKeys.set(await pinLookupKey(pin), uid);
  }
  const currentIndex = (await getVal('tenants/default/pin_lookup')) || {};
  for (const [key, uid] of Object.entries(currentIndex)) {
    if (!finalKeys.has(key)) writes.push({ path: `tenants/default/pin_lookup/${key}`, value: null });
  }
  for (const [uid, pin] of finalPinByUid) {
    const key = await pinLookupKey(pin);
    if (currentIndex[key] !== uid) {
      writes.push({ path: `tenants/default/pin_lookup/${key}`, value: uid });
      const hash = await hashPin(pin);
      writes.push({ path: `tenants/default/employees/${uid}/profile/pinHash`, value: hash });
      writes.push({ path: `tenants/default/employees/${uid}/profile/pinLookupKey`, value: key });
    }
    indexFixed = finalKeys.size; // report count after rebuild
  }

  console.log(`\nResumen: ${linked} links de userId, ${created} empleados creados, ${attendanceMigrated} fichadas migradas, ${indexFixed} índices, ${pinsAssigned} PINs asignados, ${skipped} sin procesar.`);

  if (!isApply || writes.length === 0) {
    console.log(writes.length > 0 ? '\n(usa --apply para escribir)' : '\nNada que hacer.');
    process.exit(0);
  }

  // Batch in chunks (RTDB multi-path update supports 500 paths max; web SDK caps lower)
  console.log(`\n✍️  Escribiendo ${writes.length} paths…`);
  for (let i = 0; i < writes.length; i += 400) {
    const chunk = writes.slice(i, i + 400);
    const payload = {};
    for (const w of chunk) payload[w.path] = w.value;
    await update(ref(db), payload);
    console.log(`  ✓ ${Math.min(i + 400, writes.length)}/${writes.length}`);
  }
  console.log('\n✅ Migración completa.');
  process.exit(0);
}

// ── Cleanup (post-migration) ─────────────────────────────

async function cleanupBranchPins(db) {
  const snap = await get(ref(db, 'branches'));
  if (!snap.exists()) { console.log('Nada que limpiar (sin branches).'); process.exit(0); }
  const branches = snap.val();
  const writes = [];
  let removed = 0;
  for (const [branchId, branch] of Object.entries(branches)) {
    for (const [pushId, emp] of Object.entries(branch.employees || {})) {
      const hasPin = emp.pin || emp.profile?.pin || emp.pinHash;
      if (hasPin) {
        writes.push({ path: `branches/${branchId}/employees/${pushId}/pin`, value: null });
        writes.push({ path: `branches/${branchId}/employees/${pushId}/profile/pin`, value: null });
        writes.push({ path: `branches/${branchId}/employees/${pushId}/profile/pinHash`, value: null });
        removed++;
      }
    }
  }
  console.log(`Cleanup: ${removed} empleados con PIN plano en branch → null.`);
  if (writes.length === 0) process.exit(0);
  if (!process.argv.includes('--apply')) {
    console.log('(usa --apply para escribir)');
    process.exit(0);
  }
  for (let i = 0; i < writes.length; i += 400) {
    const chunk = writes.slice(i, i + 400);
    const payload = {};
    for (const w of chunk) payload[w.path] = w.value;
    await update(ref(db), payload);
  }
  console.log('✅ Cleanup aplicado.');
  process.exit(0);
}

if (process.argv.includes('--cleanup-pins')) {
  mainCleanup();
} else if (process.argv.includes('--self-test')) { selfTest().catch((e) => { console.error('❌', e); process.exit(1); }); } else { main().catch((err) => { console.error('❌', err); process.exit(1); }); }

async function mainCleanup() {
  const serverUrl = appEnv('FIREBASE_DATABASE_URL') || appEnv('VITE_FIREBASE_DATABASE_URL');
  const botEmail = appEnv('BOT_FIREBASE_EMAIL');
  const botPassword = appEnv('BOT_FIREBASE_PASSWORD');
  if (!serverUrl || !botEmail || !botPassword) {
    console.error('❌ Faltan .env: BOT_FIREBASE_EMAIL, BOT_FIREBASE_PASSWORD, FIREBASE_DATABASE_URL.');
    process.exit(1);
  }
  const firebaseApp = initializeApp({
    apiKey: appEnv('FIREBASE_API_KEY') || '',
    authDomain: appEnv('FIREBASE_AUTH_DOMAIN') || '',
    databaseURL: serverUrl,
    projectId: appEnv('FIREBASE_PROJECT_ID') || '',
  });
  try {
    await signInWithEmailAndPassword(getAuth(firebaseApp), botEmail, botPassword);
    console.log('🔐 Autenticado como bot');
  } catch (e) {
    console.warn('⚠️ Auth falló, continúo sin auth:', e.message || e);
    process.exit(1);
  }
  await cleanupBranchPins(getDatabase(firebaseApp));
}