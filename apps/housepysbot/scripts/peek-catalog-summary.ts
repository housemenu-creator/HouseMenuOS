// Catalog summary: unique categories, tracking, prices.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const b = "monteverde";
  const snap = await get(child(ref(db), `branches/${b}/catalog/products`));
  const prods = snap.exists() ? snap.val() : {};
  const byCat = {};
  for (const pr of Object.values(prods)) {
    const c = pr.category || "(sin categoría)";
    byCat[c] = byCat[c] || [];
    byCat[c].push(pr.name);
  }
  for (const [c, names] of Object.entries(byCat).sort()) {
    console.log(`${c}: ${names.length} → ${names.slice(0, 6).join(", ")}${names.length > 6 ? ", …" : ""}`);
  }
  const track = Object.values(prods).filter(x => x.trackStock).length;
  const noPrice = Object.values(prods).filter(x => x.base_price == null).length;
  const noStock = Object.values(prods).filter(x => x.stock == null).length;
  console.log(`\ntrackStock=true: ${track}/${Object.keys(prods).length}`);
  console.log(`sin base_price: ${noPrice}`);
  console.log(`sin stock: ${noStock}`);
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });