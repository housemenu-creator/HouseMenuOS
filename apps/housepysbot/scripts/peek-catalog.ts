// Inspect catalog structure: categories + sample products (orphaned vs categorized).
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}/catalog`;

  const catSnap = await get(child(ref(db), `${base}/categories`));
  const prodSnap = await get(child(ref(db), `${base}/products`));
  const cats = catSnap.exists() ? catSnap.val() : {};
  const prods = prodSnap.exists() ? prodSnap.val() : {};

  console.log(`Total productos: ${Object.keys(prods).length}`);
  console.log(`Total categorías: ${Object.keys(cats).length}`);
  for (const [id, c] of Object.entries(cats)) {
    console.log(`CAT ${id.slice(0, 8)}: name=${c.name} active=${c.active} order=${c.order ?? c.sortOrder ?? "?"}`);
  }
  // sample product keys (first 3)
  let i = 0;
  for (const [id, p] of Object.entries(prods)) {
    if (i++ < 8) {
      console.log(`PROD ${id.slice(0, 14)}: name=${p.name} | price=${p.price} | cat=${p.categoryId || p.category || "—"} | active=${p.active} | hasImage=${!!p.image || !!p.imageUrl} | desc=${(p.description || "").slice(0, 30)}`);
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });