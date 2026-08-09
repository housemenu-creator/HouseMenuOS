// Reads real employees from DB and GENERATES the nested fix tree (no writes).
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";
import { pbkdf2, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const db = initFirebase();

function hashPin(pin) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    pbkdf2(String(pin), salt, 10000, 32, "sha256", (err, key) =>
      err ? reject(err) : resolve(salt.toString("hex") + ":" + key.toString("hex"))
    );
  });
}

const TENANT = "default";
const B = "monteverde";
const now = new Date().toISOString();

// set nested dotted path into an object tree
function setNested(root, dotted, value) {
  const parts = dotted.split("/");
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof node[p] !== "object" || node[p] === null) node[p] = {};
    node = node[p];
  }
  node[parts[parts.length - 1]] = value;
}

async function main() {
  await authenticateBot();
  const emps = (await get(child(ref(db), `branches/${B}/employees`))).val() || {};
  const tenants = {}; // nested payload

  for (const [empId, e] of Object.entries(emps)) {
    const email = e.email?.trim();
    if (!email) { console.log(`skip ${e.name}: sin email`); continue; }
    let uid = e.userId;

    if (!uid) {
      // Generar un nuevo userId (push key) y enlazarlo al empleado
      uid = (await import("firebase/database")).push(ref(db, `tenants/${TENANT}/employees`)).key;
      console.log(`→ ${e.name}: generando NUEVO userId ${uid.slice(0, 12)}`);
    }

    // Already has a tenant record?
    const rec = await get(child(ref(db), `tenants/${TENANT}/employees/${uid}`));
    if (rec.exists()) {
      console.log(`OK  ${e.name}: tenant record existe (${uid.slice(0, 12)})`);
      continue;
    }

    const pin = e.pin || null;
    const pinHash = pin ? await hashPin(pin) : null;
    const encEmail = email.replace(/\./g, ",");

    setNested(tenants, `tenants/${TENANT}/employees/${uid}`, {
      profile: { name: e.name, email, pinHash, active: true, createdAt: now },
      role: e.role || "kitchen",
      branches: { [B]: true },
    });
    setNested(tenants, `branches/${B}/_role_cache/${uid}`, e.role || "kitchen");
    setNested(tenants, `global/emails_to_uid/${encEmail}`, uid);
    setNested(tenants, `global/users/${uid}/profile`, { name: e.name, email, updatedAt: now });
    setNested(tenants, `global/users/${uid}/memberships/${TENANT}`, { role: e.role || "kitchen", joinedAt: now, active: true });
    // enlazar userId al empleado de la branch
    setNested(tenants, `branches/${B}/employees/${empId}/userId`, uid);
    console.log(`CREAR login ${e.name} uid=${uid.slice(0, 12)} role=${e.role} pin=${pin ? "sí" : "NO"}`);
  }

  writeFileSync("C:/Users/archiphone/AppData/Local/Temp/opencode/fix-logins.json", JSON.stringify(tenants, null, 2));
  console.log("\n✅ fix-logins.json generado (nested). Listo para firebase database:update /");
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });