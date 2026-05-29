import { initFirebase, ref, get, child } from "./firebase.js";
const db = initFirebase();

export async function getMenuByBranch(branchId: string) {
  const snapshot = await get(child(ref(db), `branches/${branchId}/catalog`));
  if (!snapshot.exists()) return null;
  return snapshot.val();
}

export async function searchMenu(branchId: string, term: string) {
  const catalog = await getMenuByBranch(branchId);
  if (!catalog?.products) return [];

  const results: any[] = [];
  const q = term.toLowerCase();
  const products = Object.values(catalog.products) as Record<string, any>[];

  for (const p of products) {
    if (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ) {
      results.push(p);
    }
  }
  return results;
}
