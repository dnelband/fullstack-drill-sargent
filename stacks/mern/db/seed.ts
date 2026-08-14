import "dotenv/config";
import { currentChallenge } from "../config/current-challenge.ts";
import { closeDb, getDb } from "../server/db.ts";
import type { Db } from "mongodb";

async function loadSeed(slug: typeof currentChallenge.slug): Promise<(db: Db) => Promise<void>> {
  switch (slug) {
    case "brief-desk":
      return (await import("../challenges/brief-desk/db/seed.ts")).seedChallenge;
    case "pulse-quiz":
      return (await import("../challenges/pulse-quiz/db/seed.ts")).seedChallenge;
    case "slug-studio":
      return (await import("../challenges/slug-studio/db/seed.ts")).seedChallenge;
    case "leave-desk":
      return (await import("../challenges/leave-desk/db/seed.ts")).seedChallenge;
    case "product-filter":
      return (await import("../challenges/product-filter/db/seed.ts")).seedChallenge;
    case "orders-inbox":
      return (await import("../challenges/orders-inbox/db/seed.ts")).seedChallenge;
    case "ticket-claim":
      return (await import("../challenges/ticket-claim/db/seed.ts")).seedChallenge;
    case "coupon-redeem":
      return (await import("../challenges/coupon-redeem/db/seed.ts")).seedChallenge;
    case "hold-queue":
      return (await import("../challenges/hold-queue/db/seed.ts")).seedChallenge;
    case "seat-hold":
      return (await import("../challenges/seat-hold/db/seed.ts")).seedChallenge;
    case "order-lines":
      return (await import("../challenges/order-lines/db/seed.ts")).seedChallenge;
    case "memo-desk":
      return (await import("../challenges/memo-desk/db/seed.ts")).seedChallenge;
    default:
      throw new Error(`No seed for challenge: ${slug satisfies never}`);
  }
}

async function main() {
  const db = await getDb();
  const seed = await loadSeed(currentChallenge.slug);
  console.log(`[db] seeding ${currentChallenge.slug} → ${currentChallenge.mongoDb}`);
  await seed(db);
}

main()
  .then(async () => {
    await closeDb();
    console.log("[db] seed complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] seed failed", error);
    await closeDb();
    process.exitCode = 1;
  });
