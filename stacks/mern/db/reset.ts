import "dotenv/config";
import { closeDb, getDb } from "../server/db.ts";

/** Clears every challenge collection so switching challenges never leaves stale docs. */
const COLLECTIONS = [
  "members",
  "tickets",
  "briefs",
  "orders",
  "products",
  "users",
  "leave_balances",
  "leave_requests",
  "pages",
  "questions",
  "serves",
  "coupons",
  "redemptions",
  "idempotency_keys",
] as const;

async function main() {
  const db = await getDb();
  for (const name of COLLECTIONS) {
    await db.collection(name).deleteMany({});
  }
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
