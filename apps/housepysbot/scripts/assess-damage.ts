// Assess full damage: dump key branches/monteverde subtree sizes after CLI update.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function peek(path) {
  const snap = await get(child(ref(db), path));
  return { exists: snap.exists(), val: snap.val() };
}

async function main() {
  await authenticateBot();
  const B = "monteverde";
  const paths = [
    `branches/${B}/employees`,
    `branches/${B}/logistics/ingredients`,
    `branches/${B}/logistics/recipes`,
    `branches/${B}/logistics/suppliers`,
    `branches/${B}/catalog/products`,
    `branches/${B}/catalog/categories`,
    `branches/${B}/tables`,
    `branches/${B}/_role_cache`,
    `tenants/default/employees`,
    `global/users`,
    `global/emails_to_uid`,
  ];
  for (const p of paths) {
    const { exists, val } = await peek(p);
    if (!exists) { console.log(`${p}: — VACÍO`); continue; }
    const keys = Object.keys(val);
    console.log(`${p}: ${keys.length} keys`);
    if (p.includes("employees") && p.includes("tenants")) {
      console.log("   →", JSON.stringify(val).slice(0, 200));
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });