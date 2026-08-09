// Peek at what data already exists in branch monteverde.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}`;

  const paths = ["employees", "ingredients", "recipes", "menu", "catalog",
    "tables", "config", "delivery", "suppliers", "prices", "roles", "system/roles"];

  for (const p of paths) {
    const snap = await get(child(ref(db), `${base}/${p}`));
    if (!snap.exists()) {
      console.log(`${p}: — (vacío)`);
      continue;
    }
    const val = snap.val();
    const keys = Object.keys(val);
    console.log(`${p}: ${keys.length} items`);
    for (const k of keys.slice(0, 12)) {
      const item = val[k];
      const name = item?.name || item?.title || item?.email || item?.label || "";
      const role = item?.role || "";
      const status = item?.status || "";
      console.log(`   - ${k.slice(0, 10)} ${name} ${role} ${status}`.trim());
    }
    if (keys.length > 12) console.log(`   ... (+${keys.length - 12} más)`);
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });