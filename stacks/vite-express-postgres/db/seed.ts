import "dotenv/config";
import { currentChallenge } from "../config/current-challenge.ts";
import { pool, closePool } from "../server/db.ts";
import type { Pool } from "pg";

async function loadSeed(
  slug: typeof currentChallenge.slug,
): Promise<(pool: Pool) => Promise<void>> {
  switch (slug) {
    case "dispatch-board":
      return (await import("../challenges/dispatch-board/db/seed.ts"))
        .seedChallenge;
    case "brief-desk":
      return (await import("../challenges/brief-desk/db/seed.ts")).seedChallenge;
    case "pulse-quiz":
      return (await import("../challenges/pulse-quiz/db/seed.ts")).seedChallenge;
    case "slug-studio":
      return (await import("../challenges/slug-studio/db/seed.ts"))
        .seedChallenge;
    case "leave-desk":
      return (await import("../challenges/leave-desk/db/seed.ts")).seedChallenge;
    case "product-filter":
      return (await import("../challenges/product-filter/db/seed.ts"))
        .seedChallenge;
    case "orders-inbox":
      return (await import("../challenges/orders-inbox/db/seed.ts"))
        .seedChallenge;
    case "ticket-claim":
      return (await import("../challenges/ticket-claim/db/seed.ts"))
        .seedChallenge;
    case "coupon-redeem":
      return (await import("../challenges/coupon-redeem/db/seed.ts"))
        .seedChallenge;
    default:
      throw new Error(`No seed for challenge: ${slug satisfies never}`);
  }
}

async function main() {
  const seed = await loadSeed(currentChallenge.slug);
  console.log(`[db] seeding ${currentChallenge.slug}`);
  await seed(pool);
}

main()
  .then(async () => {
    await closePool();
    console.log("[db] seed complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] seed failed", error);
    await closePool();
    process.exitCode = 1;
  });
