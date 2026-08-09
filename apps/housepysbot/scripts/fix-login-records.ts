// Fix gaps: (1) ensure tenant+global login records for all employees,
// (2) delete orphan E2E recipe, (3) unique PINs for duplicates.
// Mirrors authService.createUser/migrateUserToGlobal exactly.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child, update, remove } from "../src/lib/firebase.js";
import { pbkdf2, randomBytes } from "node:crypto";

const db = initFirebase();

// Same format as apps/house-menu/src/lib/crypto.js hashPin (PBKDF2-SHA256, 10k, salt:hash hex)
function hashPin(pin) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    pbkdf2(pin, salt, 10000, 32, "sha256", (err, key) => {
      if (err) return reject(err);
      resolve(salt.toString("hex") + ":" + key.toString("hex"));
    });
  });
}

async function getVal(path) {
  const snap = await get(child(ref(db), path));
  return { exists: snap.exists(), val: () => snap.val() };
}

const TENANT = "default";

async function main() {
  await authenticateBot();
  const b = "monteverde";
  const base = `branches/${b}`;

  const empsSnap = await getVal(`${base}/employees`);
  const emps = empsSnap.exists ? empsSnap.val() : {};
  const recsSnap = await getVal(`${base}/logistics/recipes`);
  const recs = recsSnap.exists ? recsSnap.val() : {};

  console.log("=== 1. Asegurar registros de login (tenant + global + role cache) ===\n");

  for (const [empId, e] of Object.entries(emps)) {
    const email = e.email?.trim();
    if (!email) { console.log(`SKIP ${e.name}: sin email`); continue; }
    const role = e.role || "kitchen";
    const name = e.name || "";
    const uid = e.userId;

    const existing = uid
      ? (await getVal(`tenants/${TENANT}/employees/${uid}`)).exists
      : false;

    if (existing) {
      console.log(`OK   ${name}: ya tiene registro tenant (${uid.slice(0, 12)}). PIN local: ${e.pin || "—"}`);
      continue;
    }

    const newUid = uid || empId;
    const pin = e.pin || null;
    const pinHash = pin ? await hashPin(pin) : null;

    const updates = {
      [`tenants/${TENANT}/employees/${newUid}`]: {
        profile: { name, email, pinHash, active: true, createdAt: new Date().toISOString() },
        role,
        branches: { [b]: true },
      },
      [`${base}/_role_cache/${newUid}`]: role,
      [`global/emails_to_uid/${email.replace(/\./g, ",")}`]: newUid,
      [`global/users/${newUid}/profile`]: { name, email, updatedAt: new Date().toISOString() },
      [`global/users/${newUid}/memberships/${TENANT}`]: { role, joinedAt: new Date().toISOString(), active: true },
    };
    if (!uid) updates[`${base}/employees/${empId}/userId`] = newUid;

    await update(ref(db), updates);
    console.log(`CREADO login para ${name}: uid=${newUid.slice(0, 12)} role=${role} email=${email}${pin ? ` pinHash=SÍ` : " (sin PIN)"}`);
  }

  console.log("\n=== 2. Borrar recetas huérfanas (E2E de prueba) ===\n");
  let removed = 0;
  for (const [rid, r] of Object.entries(recs)) {
    const pn = r?.productName || "";
    if (/E2E|test/i.test(pn)) {
      await remove(ref(db), `${base}/logistics/recipes/${rid}`);
      console.log(`Borrada receta ${rid.slice(0, 12)} (${pn})`);
      removed++;
    }
  }
  if (!removed) console.log("(no hay recetas de prueba)");

  console.log("\n=== PINs en uso ===\n");
  Object.values(emps).forEach((e) => {
    console.log(`${e.name}: ${e.pin || "—"}`);
  });
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });