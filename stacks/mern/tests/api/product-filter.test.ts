import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { ProductRecord } from "../../shared/types.ts";

const fixtureProducts: ProductRecord[] = [
  { _id: "prod1", name: "Air Runner", brand: "Nike", discount_percent: 15, stock: 12 },
  { _id: "prod2", name: "Classic Tee", brand: "Nike", discount_percent: 5, stock: 0 },
  { _id: "prod3", name: "Garden Hose", brand: "Gucci", discount_percent: 20, stock: 3 },
  { _id: "prod4", name: "Logo Hoodie", brand: "Gucci", discount_percent: 0, stock: 8 },
  { _id: "prod5", name: "Trail Boot", brand: "Adidas", discount_percent: 25, stock: 0 },
  { _id: "prod6", name: "Court Sneaker", brand: "Adidas", discount_percent: 10, stock: 20 },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("products").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded products. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("product filter API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("products").deleteMany({});
    await db.collection<ProductRecord>("products").insertMany(fixtureProducts);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] POST /api/products/query with empty filters returns products ordered by name", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/products/query")
      .send({ filters: [] })
      .expect(200);

    expect(response.body.map((p: { _id: string }) => p._id)).toEqual([
      "prod1",
      "prod2",
      "prod6",
      "prod3",
      "prod4",
      "prod5",
    ]);
  });

  test("[API] brand contains filter is case-insensitive", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/products/query")
      .send({
        filters: [{ key: "brand", operator: "contains", value: "gucc" }],
      })
      .expect(200);

    expect(response.body.map((p: { _id: string }) => p._id)).toEqual([
      "prod3",
      "prod4",
    ]);
  });

  test("[API] discount greater_than filter returns matching products", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/products/query")
      .send({
        filters: [{ key: "discount", operator: "greater_than", value: 15 }],
      })
      .expect(200);

    expect(response.body.map((p: { _id: string }) => p._id)).toEqual([
      "prod3",
      "prod5",
    ]);
  });

  test("[API] stock in_stock filter returns only products with stock > 0", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/products/query")
      .send({
        filters: [{ key: "stock", operator: "in_stock" }],
      })
      .expect(200);

    expect(response.body.every((p: { stock: number }) => p.stock > 0)).toBe(true);
    expect(response.body).toHaveLength(4);
  });

  test("[API] combined filters apply as intersection", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/products/query")
      .send({
        filters: [
          { key: "brand", operator: "contains", value: "nike" },
          { key: "stock", operator: "in_stock" },
          { key: "discount", operator: "greater_than", value: 10 },
        ],
      })
      .expect(200);

    expect(response.body.map((p: { _id: string }) => p._id)).toEqual(["prod1"]);
  });

  test("[API] invalid filter returns 400", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/products/query")
      .send({
        filters: [{ key: "brand", operator: "equals", value: "Nike" }],
      })
      .expect(400);

    await request(app)
      .post("/api/products/query")
      .send({
        filters: [{ key: "discount", operator: "greater_than", value: "lots" }],
      })
      .expect(400);
  });
});
