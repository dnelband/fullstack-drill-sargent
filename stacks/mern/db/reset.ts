import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";

async function main() {
  const db = await getDb();
  await db.collection("orders").deleteMany({});
  // Legacy collections from prior challenges (harmless if empty)
  await db.collection("products").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("leave_balances").deleteMany({});
  await db.collection("leave_requests").deleteMany({});
  await db.collection("pages").deleteMany({});
  await db.collection("questions").deleteMany({});
  await db.collection("serves").deleteMany({});
  await db.collection("members").deleteMany({});
  await db.collection("briefs").deleteMany({});
}

main()
  .then(async () => {
    await closeDb();
    console.log("[db] reset complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] reset failed", error);
    await closeDb();
    process.exitCode = 1;
  });
