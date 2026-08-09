// Dump full structure of a few orders to understand schema.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const snap = await get(child(ref(db), `branches/${branchId}/orders`));
  const orders = snap.val();
  const entries = Object.entries(orders);
  let shown = 0;
  for (const [id, o] of entries) {
    if (shown >= 3) break;
    console.log(`=== ${id} ===`);
    console.log(JSON.stringify(o, null, 2).slice(0, 1200));
    console.log();
    shown++;
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });