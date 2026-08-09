// Correct stock/cost check using REAL ingredient fields (stock, cost, minStock, supplierId).
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const b = "monteverde";
  const ing = (await get(child(ref(db), `branches/${b}/logistics/ingredients`))).val() || {};
  const rec = (await get(child(ref(db), `branches/${b}/logistics/recipes`))).val() || {};

  const names = Object.values(ing);
  console.log(`insumos: ${names.length}`);
  console.log(`  con stock definido: ${names.filter(i => i.stock != null).length}`);
  console.log(`  con cost definido: ${names.filter(i => i.cost != null).length}`);
  console.log(`  con minStock: ${names.filter(i => i.minStock != null).length}`);
  console.log(`  con supplierId: ${names.filter(i => i.supplierId).length}`);
  console.log(`  con categoria: ${names.filter(i => i.category).length}`);
  const sample = names.find(i => i.stock != null);
  const sample2 = names.find(i => i.supplierId);
  console.log("\nmuestra con stock:", JSON.stringify(sample, null, 2).slice(0, 400));
  console.log("\nmuestra con supplier:", JSON.stringify(sample2, null, 2).slice(0, 400));

  // recipes linked to actual catalog products?
  const prods = (await get(child(ref(db), `branches/${b}/catalog/products`))).val() || {};
  let linked = 0, orphan = 0;
  for (const r of Object.values(rec)) {
    if (r.productId && prods[r.productId]) linked++; else orphan++;
  }
  console.log(`\nrecetas: ${Object.keys(rec).length} | enlazadas a productos existentes: ${linked} | huerfanas: ${orphan}`);

  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });