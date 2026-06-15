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

/**
 * Get all configured branch IDs from env var.
 * HOUSEPYSBOT_BRANCH_ID can be comma-separated: "casa-matriz,san-isidro,miraflores"
 * Falls back to ["default"].
 */
export function getAllBranchIds(): string[] {
  const raw = process.env.HOUSEPYSBOT_BRANCH_ID ||
              process.env.CHALY_BRANCH_ID ||
              process.env.VITE_HOUSEPYSBOT_BRANCH_ID ||
              "default";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Alias for getPrimaryBranchId — first branch in the list */
export function getPrimaryBranchId(): string {
  return getAllBranchIds()[0];
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
