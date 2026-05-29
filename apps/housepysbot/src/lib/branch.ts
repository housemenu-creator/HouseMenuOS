import { initFirebase, ref, get, child } from "./firebase.js";
const db = initFirebase();

export interface BranchInfo {
  name: string;
  address: string;
  phone: string;
  schedule: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeThreshold: number;
}

export async function getBranchInfo(branchId: string): Promise<BranchInfo | null> {
  try {
    const snapshot = await get(child(ref(db), `branches_config/${branchId}`));
    if (!snapshot.exists()) return null;
    const data = snapshot.val();
    return {
      name: data.name || "Sede Principal",
      address: data.address || "",
      phone: data.phone || "",
      schedule: data.schedule || "",
      deliveryEnabled: data.deliveryEnabled ?? false,
      deliveryFee: data.deliveryFee ?? 0,
      freeThreshold: data.freeThreshold ?? 0,
    };
  } catch (e) {
    console.warn("branch.getBranchInfo error:", e);
    return null;
  }
}
