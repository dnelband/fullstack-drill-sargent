import "dotenv/config";
import { pool, closePool } from "../server/db.ts";

/** Drop every challenge table so switching challenges never leaves stale schema. */
const DROP_SQL = `
  DROP TABLE IF EXISTS
    callbacks,
    agents,
    briefs,
    members,
    questions,
    serves,
    pages,
    users,
    leave_balances,
    leave_requests,
    products,
    orders,
    tickets,
    coupons,
    redemptions,
    idempotency_keys
  CASCADE;
`;

async function main() {
  await pool.query(DROP_SQL);
}

main()
  .then(async () => {
    await closePool();
    console.log("[db] reset complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] reset failed", error);
    await closePool();
    process.exitCode = 1;
  });
