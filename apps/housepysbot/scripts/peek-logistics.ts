// Peek logistics subtree (where insumos/recipes actually live).
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const b = "monteverde";
  const snap = await get(child(ref(db), `branches/${b}/logistics`));
  if (!snap.exists()) { console.log("logistics: vacío"); process.exit(0); }
  const val = snap.val();
  console.log("=== logistics/ keys:", Object.keys(val).join(", "));
  for (const [k, items] of Object.entries(val)) {
    if (typeof items !== "object" || items === null) { console.log(`${k}: ${items}`); continue; }
    const entries = Object.entries(items);
    console.log(`\n=== logistics/${k}: ${entries.length} items ===`);
    for (const [id, item] of entries.slice(0, 15)) {
      const name = item?.name || item?.title || "";
      const extra = item?.unit ? ` | unit=${item.unit}` : "";
      const cost = item?.costPerUnit != null ? ` | cost=${item.costPerUnit}` : "";
      const stock = item?.currentStock != null ? ` | stock=${item.currentStock}` : "";
      const status = item?.active === false ? " (inactivo)" : "";
      console.log(`  - ${id.slice(0, 10)} ${name}${extra}${cost}${stock}${status}`);
    }
    if (entries.length > 15) console.log(`   ... (+${entries.length - 15} más)`);
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });