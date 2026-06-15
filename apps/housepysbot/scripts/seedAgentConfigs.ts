/**
 * Seed Agent Configs — pushes hardcoded defaults to Firebase RTDB.
 *
 * Usage: npx tsx scripts/seedAgentConfigs.ts <branchId>
 *
 * This writes the default agent system prompts and allowed tools to:
 *   branches/{BRANCH}/system/agents/{agentId}/
 *
 * After seeding, you can edit these values directly in Firebase
 * and they will be picked up by the bot within ~1 minute (TTL cache).
 */

import "dotenv/config";
import { initFirebase, get, child, ref, update, set } from "../src/lib/firebase.js";
import { AGENTS } from "../src/agents/config.js";

const db = initFirebase();

async function seedAgentConfigs(branchId: string) {
  console.log(`🌱 Seeding agent configs for branch: "${branchId}"\n`);

  for (const [agentId, config] of Object.entries(AGENTS)) {
    const path = `branches/${branchId}/system/agents/${agentId}`;

    // Check if already exists
    const existing = await get(child(ref(db), path));
    if (existing.exists()) {
      const data = existing.val();
      console.log(`  ⏭ ${agentId} — ya existe (última edición: ${data.updatedAt ? new Date(data.updatedAt).toISOString() : "desconocida"})`);
      continue;
    }

    await set(child(ref(db), path), {
      name: config.name,
      systemPrompt: config.systemPrompt,
      allowedTools: config.allowedTools,
      updatedAt: Date.now(),
    });

    console.log(`  ✅ ${agentId} — "${config.name}" sembrado`);
  }

  console.log(`\n✅ Done. Agents configurados en: branches/${branchId}/system/agents/`);
}

const branchId = process.argv[2];
if (!branchId) {
  console.error("❌ Usá: npx tsx scripts/seedAgentConfigs.ts <branchId>");
  console.error("   Ej:  npx tsx scripts/seedAgentConfigs.ts casa-matriz");
  process.exit(1);
}

seedAgentConfigs(branchId).catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
