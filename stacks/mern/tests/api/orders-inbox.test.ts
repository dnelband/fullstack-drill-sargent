import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { OrderRecord } from "../../shared/types.ts";

const fixtureOrders: OrderRecord[] = [
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
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("orders").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded orders. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("orders inbox API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("orders").deleteMany({});
    await db.collection<OrderRecord>("orders").insertMany(fixtureOrders);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/orders returns orders ordered by created_at desc", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/orders").expect(200);
    expect(response.body.map((o: { _id: string }) => o._id)).toEqual([
      "ord1",
      "ord2",
      "ord3",
      "ord4",
      "ord5",
    ]);
  });

  test("[API] GET /api/orders filters by status", async () => {
    const app = await createApp();
    const response = await request(app)
      .get("/api/orders")
      .query({ status: "paid" })
      .expect(200);
    expect(response.body.map((o: { _id: string }) => o._id)).toEqual([
      "ord2",
      "ord5",
    ]);
  });

  test("[API] GET /api/orders returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app).get("/api/orders").query({ status: "pending" }).expect(400);
    await request(app).get("/api/orders").query({ status: 12 }).expect(400);
  });

  test("[API] GET /api/orders/summary returns status counts and total_cents", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/orders/summary").expect(200);
    const expected = {
      open: 1,
      paid: 2,
      shipped: 1,
      cancelled: 1,
      total_cents: 4599 + 12900 + 7800 + 2200 + 5600,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
  });
});
