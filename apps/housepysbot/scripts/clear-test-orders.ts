// Delete test orders + related indexes. Dry run first: pass --commit to actually delete.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child, set } from "../src/lib/firebase.js";

const db = initFirebase();
const COMMIT = process.argv.includes("--commit");

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}`;

  // 1. orders
  const ordersSnap = await get(child(ref(db), `${base}/orders`));
  const orderIds = ordersSnap.exists() ? Object.keys(ordersSnap.val()) : [];
  console.log(`orders: ${orderIds.length}`);

  // 2. customer_orders index (per phone → order ids)
  const idxSnap = await get(child(ref(db), `${base}/customer_orders`));
  if (idxSnap.exists()) console.log(`customer_orders: ${Object.keys(idxSnap.val()).length} phones`);

  // 3. orders_by_session
  const sesSnap = await get(child(ref(db), `${base}/orders_by_session`));
  if (sesSnap.exists()) console.log(`orders_by_session: ${Object.keys(sesSnap.val()).length} keys`);

  if (!COMMIT) {
    console.log("\nDRY RUN — no se borró nada. Corré con --commit para eliminar.");
    process.exit(0);
  }

  // Commit: remove orders + indexes
  await set(child(ref(db), `${base}/orders`), null);
  await set(child(ref(db), `${base}/customer_orders`), null);
  await set(child(ref(db), `${base}/orders_by_session`), null);
  console.log("✅ Borrados: orders, customer_orders, orders_by_session");
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });