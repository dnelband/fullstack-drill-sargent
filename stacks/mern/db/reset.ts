import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";

async function main() {
  const db = await getDb();
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
