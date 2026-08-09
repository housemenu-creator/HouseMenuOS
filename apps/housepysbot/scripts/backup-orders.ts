// Backup orders + customer_orders index to local JSON before cleanup.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";
import { writeFileSync } from "node:fs";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}`;
  const backup: any = {};

  for (const path of ["orders", "customer_orders"]) {
    const snap = await get(child(ref(db), `${base}/${path}`));
    backup[path] = snap.exists() ? snap.val() : null;
  }

  const file = `backup-orders-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify(backup, null, 2), "utf8");
  console.log(`✅ Backup: ${file} (${Object.keys(backup.orders || {}).length} orders)`);
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });