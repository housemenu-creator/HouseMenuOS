/**
 * Clear saved WhatsApp session from Firebase to force fresh QR.
 * Run: npx tsx scripts/clear-wa-session.ts
 */
import "dotenv/config";
import { initFirebase, authenticateBot, ref, set, child } from "../src/lib/firebase.js";
import { rmSync, existsSync } from "node:fs";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";

  // 1. Clear from Firebase
  await set(ref(db, `wa_session/${branchId}`), null);
  console.log(`✅ wa_session/${branchId} borrado de Firebase`);

  // 2. Clear local session dir
  const sessionDir = process.env.WHATSAPP_SESSION_DIR || "./wa_session";
  if (existsSync(sessionDir)) {
    rmSync(sessionDir, { recursive: true, force: true });
    console.log(`✅ ${sessionDir} borrado localmente`);
  }

  console.log("🎉 Sesión eliminada. Refrescá https://housepysbot.onrender.com para ver el QR nuevo.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
