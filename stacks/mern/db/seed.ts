import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";
import type { ProductRecord } from "../shared/types.ts";

const products: ProductRecord[] = [
  { _id: "prod1", name: "Air Runner", brand: "Nike", discount_percent: 15, stock: 12 },
  { _id: "prod2", name: "Classic Tee", brand: "Nike", discount_percent: 5, stock: 0 },
  { _id: "prod3", name: "Garden Hose", brand: "Gucci", discount_percent: 20, stock: 3 },
  { _id: "prod4", name: "Logo Hoodie", brand: "Gucci", discount_percent: 0, stock: 8 },
  { _id: "prod5", name: "Trail Boot", brand: "Adidas", discount_percent: 25, stock: 0 },
  { _id: "prod6", name: "Court Sneaker", brand: "Adidas", discount_percent: 10, stock: 20 },
  { _id: "prod7", name: "City Pack", brand: "North Face", discount_percent: 30, stock: 2 },
  { _id: "prod8", name: "Daily Sock", brand: "Nike", discount_percent: 12, stock: 100 },
];

async function main() {
  const db = await getDb();
  await db.collection<ProductRecord>("products").insertMany(products);
  console.log(`[db] seeded ${products.length} products`);
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
