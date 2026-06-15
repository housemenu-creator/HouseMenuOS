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

  for (const [id, p] of Object.entries(catalog.products) as [string, any][]) {
    if (p.available === false) continue;
    if (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ) {
      results.push({ ...p, id });
    }
  }
  return results;
}
