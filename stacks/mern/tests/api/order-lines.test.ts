import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type {
  CatalogProduct,
  DraftOrderLine,
  DraftOrderRecord,
  OrderOwner,
} from "../../shared/types.ts";
import { expectJsonMatch } from "../expect-json.ts";

const fixtureMembers: OrderOwner[] = [
  { _id: "m1", display_name: "Ava Owner" },
  { _id: "m2", display_name: "Ben Owner" },
];

const fixtureProducts: CatalogProduct[] = [
  { _id: "p1", name: "Widget", unit_price_cents: 1000 },
  { _id: "p2", name: "Gadget", unit_price_cents: 2500 },
  { _id: "p3", name: "Cable", unit_price_cents: 500 },
];

type OrderDoc = Omit<DraftOrderRecord, "lines">;

const fixtureOrders: OrderDoc[] = [
  {
    _id: "o1",
    customer_name: "Northwind",
    status: "draft",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 4500,
    notes: "Rush if possible",
    version: 1,
    updated_at: "2026-08-13T10:00:00.000Z",
  },
  {
    _id: "o2",
    customer_name: "Acme",
    status: "submitted",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 1000,
    notes: "",
    version: 2,
    updated_at: "2026-08-12T10:00:00.000Z",
  },
  {
    _id: "o3",
    customer_name: "Globex",
    status: "cancelled",
    owner_id: "m1",
    owner_name: "Ava Owner",
    total_cents: 500,
    notes: "Customer withdrew",
    version: 2,
    updated_at: "2026-08-11T10:00:00.000Z",
  },
  {
    _id: "o4",
    customer_name: "Initech",
    status: "draft",
    owner_id: "m2",
    owner_name: "Ben Owner",
    total_cents: 0,
    notes: "",
    version: 1,
    updated_at: "2026-08-10T10:00:00.000Z",
  },
];

const fixtureLines: DraftOrderLine[] = [
  {
    _id: "ol1",
    order_id: "o1",
    product_id: "p1",
    product_name: "Widget",
    quantity: 2,
    unit_price_cents: 1000,
    line_total_cents: 2000,
  },
  {
    _id: "ol2",
    order_id: "o1",
    product_id: "p2",
    product_name: "Gadget",
    quantity: 1,
    unit_price_cents: 2500,
    line_total_cents: 2500,
  },
  {
    _id: "ol3",
    order_id: "o2",
    product_id: "p1",
    product_name: "Widget",
    quantity: 1,
    unit_price_cents: 1000,
    line_total_cents: 1000,
  },
  {
    _id: "ol4",
    order_id: "o3",
    product_id: "p3",
    product_name: "Cable",
    quantity: 1,
    unit_price_cents: 500,
    line_total_cents: 500,
  },
];

async function restoreFixtures() {
  const db = await getDb();
  await db.collection("members").deleteMany({});
  await db.collection("products").deleteMany({});
  await db.collection("orders").deleteMany({});
  await db.collection("order_lines").deleteMany({});
  await db.collection<OrderOwner>("members").insertMany(fixtureMembers);
  await db.collection<CatalogProduct>("products").insertMany(fixtureProducts);
  await db.collection<OrderDoc>("orders").insertMany(fixtureOrders);
  await db.collection<DraftOrderLine>("order_lines").insertMany(fixtureLines);
}

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("orders").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded orders. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("order lines API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    await restoreFixtures();
  });

  afterEach(async () => {
    await restoreFixtures();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/orders filters by status", async () => {
    const app = await createApp();
    const draft = await request(app)
      .get("/api/orders")
      .query({ status: "draft" })
      .expect(200);

    expect(draft.body.map((order: { _id: string }) => order._id)).toEqual([
      "o1",
      "o4",
    ]);

    const all = await request(app).get("/api/orders").expect(200);
    expect(all.body.map((order: { _id: string }) => order._id)).toEqual([
      "o1",
      "o2",
      "o3",
      "o4",
    ]);

    expectJsonMatch(all.body[0], {
      _id: "o1",
      customer_name: "Northwind",
      status: "draft",
      owner_id: "m1",
      owner_name: "Ava Owner",
      total_cents: 4500,
      notes: "Rush if possible",
      version: 1,
      updated_at: "2026-08-13T10:00:00.000Z",
      lines: [
        {
          _id: "ol1",
          order_id: "o1",
          product_id: "p1",
          product_name: "Widget",
          quantity: 2,
          unit_price_cents: 1000,
          line_total_cents: 2000,
        },
        {
          _id: "ol2",
          order_id: "o1",
          product_id: "p2",
          product_name: "Gadget",
          quantity: 1,
          unit_price_cents: 2500,
          line_total_cents: 2500,
        },
      ],
    });
  });

  test("[API] GET /api/orders returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app)
      .get("/api/orders")
      .query({ status: "nope" })
      .expect(400);
  });

  test("[API] GET /api/orders/summary counts by status", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/orders/summary").expect(200);
    expectJsonMatch(response.body, {
      draft: 2,
      submitted: 1,
      cancelled: 1,
    });
  });

  test("[API] POST /api/orders/:id/lines adds a line on a draft order", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/orders/o1/lines")
      .send({
        owner_id: "m1",
        expected_version: 1,
        product_id: "p3",
        quantity: 3,
      })
      .expect(200);

    expect(response.body._id).toBe("o1");
    expect(response.body.status).toBe("draft");
    expect(response.body.version).toBe(2);
    expect(response.body.total_cents).toBe(6000);
    expect(response.body.lines).toHaveLength(3);

    const cable = response.body.lines.find(
      (line: { product_id: string }) => line.product_id === "p3",
    );
    expectJsonMatch(cable, {
      order_id: "o1",
      product_id: "p3",
      product_name: "Cable",
      quantity: 3,
      unit_price_cents: 500,
      line_total_cents: 1500,
    });

    const ids = response.body.lines.map((line: { _id: string }) => line._id);
    expect(ids).toEqual([...ids].sort());
  });

  test("[API] POST /api/orders/:id/lines returns 409 when the product is already on the order", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/orders/o1/lines")
      .send({
        owner_id: "m1",
        expected_version: 1,
        product_id: "p1",
        quantity: 1,
      })
      .expect(409);

    expect(response.body.message).toEqual(expect.any(String));
    expectJsonMatch(response.body.latest, {
      _id: "o1",
      version: 1,
      total_cents: 4500,
      status: "draft",
      lines: [
        {
          _id: "ol1",
          order_id: "o1",
          product_id: "p1",
          product_name: "Widget",
          quantity: 2,
          unit_price_cents: 1000,
          line_total_cents: 2000,
        },
        {
          _id: "ol2",
          order_id: "o1",
          product_id: "p2",
          product_name: "Gadget",
          quantity: 1,
          unit_price_cents: 2500,
          line_total_cents: 2500,
        },
      ],
    });
  });

  test("[API] Concurrent line adds with the same expected_version allow exactly one winner", async () => {
    const app = await createApp();
    const [first, second] = await Promise.all([
      request(app).post("/api/orders/o4/lines").send({
        owner_id: "m2",
        expected_version: 1,
        product_id: "p1",
        quantity: 1,
      }),
      request(app).post("/api/orders/o4/lines").send({
        owner_id: "m2",
        expected_version: 1,
        product_id: "p2",
        quantity: 1,
      }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 412]);

    const winner = first.status === 200 ? first : second;
    const loser = first.status === 412 ? first : second;

    expectJsonMatch(winner.body, {
      _id: "o4",
      version: 2,
      status: "draft",
    });
    expect(winner.body.lines).toHaveLength(1);
    expect(winner.body.lines[0].order_id).toBe("o4");

    expect(loser.body.latest._id).toBe("o4");
    expect(loser.body.latest.version).toBe(2);
    expect(loser.body.latest.lines).toHaveLength(1);
    expect(loser.body.latest.lines[0].order_id).toBe("o4");
  });

  test("[API] PATCH /api/orders/:id/lines/:lineId updates quantity when version matches", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/orders/o1/lines/ol1")
      .send({ owner_id: "m1", expected_version: 1, quantity: 5 })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "o1",
      version: 2,
      total_cents: 7500,
      status: "draft",
      lines: [
        {
          _id: "ol1",
          order_id: "o1",
          product_id: "p1",
          product_name: "Widget",
          quantity: 5,
          unit_price_cents: 1000,
          line_total_cents: 5000,
        },
        {
          _id: "ol2",
          order_id: "o1",
          product_id: "p2",
          product_name: "Gadget",
          quantity: 1,
          unit_price_cents: 2500,
          line_total_cents: 2500,
        },
      ],
    });
  });

  test("[API] PATCH returns 412 with latest when the version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/orders/o1/lines/ol1")
      .send({ owner_id: "m1", expected_version: 99, quantity: 5 })
      .expect(412);

    expect(response.body.latest._id).toBe("o1");
    expect(response.body.latest.status).toBe("draft");
    expect(response.body.latest.version).toBe(1);
    expect(response.body.latest.total_cents).toBe(4500);
    expect(response.body.latest.lines).toHaveLength(2);
  });

  test("[API] PATCH returns 422 with latest when the order is submitted", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/orders/o2/lines/ol3")
      .send({ owner_id: "m1", expected_version: 2, quantity: 9 })
      .expect(422);

    expect(response.body.latest._id).toBe("o2");
    expect(response.body.latest.status).toBe("submitted");
    expect(response.body.latest.version).toBe(2);
    expect(response.body.latest.lines).toHaveLength(1);
  });

  test("[API] PATCH returns 410 with latest when the order is cancelled (even if version is stale)", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/orders/o3/lines/ol4")
      .send({ owner_id: "m1", expected_version: 99, quantity: 9 })
      .expect(410);

    expect(response.body.latest._id).toBe("o3");
    expect(response.body.latest.status).toBe("cancelled");
    expect(response.body.latest.version).toBe(2);
    expect(response.body.latest.lines).toHaveLength(1);
  });

  test("[API] PATCH returns 403 when owner_id is not the order owner", async () => {
    const app = await createApp();
    await request(app)
      .patch("/api/orders/o1/lines/ol1")
      .send({ owner_id: "m2", expected_version: 1, quantity: 5 })
      .expect(403);
  });

  test("[API] POST /api/orders/:id/submit submits a draft order", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/orders/o1/submit")
      .send({ owner_id: "m1", expected_version: 1 })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "o1",
      status: "submitted",
      version: 2,
      total_cents: 4500,
      lines: [
        {
          _id: "ol1",
          order_id: "o1",
          product_id: "p1",
          product_name: "Widget",
          quantity: 2,
          unit_price_cents: 1000,
          line_total_cents: 2000,
        },
        {
          _id: "ol2",
          order_id: "o1",
          product_id: "p2",
          product_name: "Gadget",
          quantity: 1,
          unit_price_cents: 2500,
          line_total_cents: 2500,
        },
      ],
    });

    const summary = await request(app).get("/api/orders/summary").expect(200);
    expectJsonMatch(summary.body, {
      draft: 1,
      submitted: 2,
      cancelled: 1,
    });
  });
});
