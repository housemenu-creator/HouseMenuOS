// Dump one full product to see real field structure.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}/catalog/products`;

  const prodSnap = await get(child(ref(db), base));
  const prods = prodSnap.exists() ? prodSnap.val() : {};

  // Show ALL keys present across products (union) to understand the shape
  const allKeys = new Set();
  for (const p of Object.values(prods)) Object.keys(p).forEach(k => allKeys.add(k));
  console.log("Campos presentes en productos:", [...allKeys].join(", "));

  // Show two full products
  let i = 0;
  for (const [id, p] of Object.entries(prods)) {
    if (i++ < 2) {
      console.log(`\nFull product ${id}:\n`, JSON.stringify(p, null, 2));
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });