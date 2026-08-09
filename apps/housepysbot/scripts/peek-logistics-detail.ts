// Inspect ingredient + recipe shapes to confirm linkage completeness.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const b = "monteverde";

  const ing = (await get(child(ref(db), `branches/${b}/logistics/ingredients`))).val() || {};
  const rec = (await get(child(ref(db), `branches/${b}/logistics/recipes`))).val() || {};
  const sup = (await get(child(ref(db), `branches/${b}/logistics/suppliers`))).val() || {};

  // Ingredient field union
  const ingKeys = new Set();
  Object.values(ing).forEach(i => i && Object.keys(i).forEach(k => ingKeys.add(k)));
  console.log("=== ingredient fields:", [...ingKeys].join(", "));
  const withStock = Object.values(ing).filter(i => i && i.currentStock != null).length;
  const withCost = Object.values(ing).filter(i => i && i.costPerUnit != null).length;
  const withSupplier = Object.values(ing).filter(i => i && (i.supplierId || i.supplier)).length;
  console.log(`insumos: ${Object.keys(ing).length} | con stock: ${withStock} | con costo: ${withCost} | con proveedor: ${withSupplier}`);

  // Recipe field union
  const recKeys = new Set();
  Object.values(rec).forEach(r => r && Object.keys(r).forEach(k => recKeys.add(k)));
  console.log("\n=== recipe fields:", [...recKeys].join(", "));
  const withProductId = Object.values(rec).filter(r => r && (r.productId || r.product_ids || r.product_key)).length;
  console.log(`recetas: ${Object.keys(rec).length} | con productId: ${withProductId}`);

  // sample recipes (first 5 full)
  let i = 0;
  for (const [id, r] of Object.entries(rec)) {
    if (i++ < 3) console.log(`\nRECIPE ${id}:\n`, JSON.stringify(r, null, 2).slice(0, 900));
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });