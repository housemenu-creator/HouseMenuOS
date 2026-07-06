/**
 * Generate a custom Firebase Auth token for the bot.
 * Run: npx tsx scripts/gen-token.ts
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const app = initializeApp({
    projectId: "gen-lang-client-0964377492",
    databaseURL: "https://gen-lang-client-0964377492-default-rtdb.firebaseio.com",
  });

  const uid = process.env.BOT_FIREBASE_UID || "n15qzqq6Jkbiko0CeEiACN7H9kB2";
  const token = await getAuth(app).createCustomToken(uid);
  console.log(token);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
