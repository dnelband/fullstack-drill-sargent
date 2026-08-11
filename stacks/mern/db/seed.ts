import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";
import type { OrderRecord } from "../shared/types.ts";

const orders: OrderRecord[] = [
  {
    _id: "ord1",
    customer_name: "Ava Ng",
    status: "open",
    total_cents: 4599,
    created_at: "2026-08-10T14:00:00.000Z",
    notes: "Gift wrap",
  },
  {
    _id: "ord2",
    customer_name: "Ben Ortiz",
    status: "paid",
    total_cents: 12900,
    created_at: "2026-08-10T13:00:00.000Z",
    notes: "Express shipping",
  },
  {
    _id: "ord3",
    customer_name: "Cara Quinn",
    status: "shipped",
    total_cents: 7800,
    created_at: "2026-08-10T12:00:00.000Z",
    notes: "Left at door",
  },
  {
    _id: "ord4",
    customer_name: "Devon Ruiz",
    status: "cancelled",
    total_cents: 2200,
    created_at: "2026-08-10T11:00:00.000Z",
    notes: "Customer request",
  },
  {
    _id: "ord5",
    customer_name: "Elena Park",
    status: "paid",
    total_cents: 5600,
    created_at: "2026-08-10T10:00:00.000Z",
    notes: "",
  },
  {
    _id: "ord6",
    customer_name: "Finn Blake",
    status: "open",
    total_cents: 9900,
    created_at: "2026-08-10T09:00:00.000Z",
    notes: "Call before delivery",
  },
];

async function main() {
  const db = await getDb();
  await db.collection<OrderRecord>("orders").insertMany(orders);
  console.log(`[db] seeded ${orders.length} orders`);
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
