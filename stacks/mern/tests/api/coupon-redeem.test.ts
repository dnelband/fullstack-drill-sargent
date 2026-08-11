import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { CouponRecord } from "../../shared/types.ts";
import { expectJsonEqual, expectJsonMatch } from "../expect-json.ts";

const fixtureCoupons: CouponRecord[] = [
  {
    _id: "c1",
    code: "WELCOME10",
    title: "Welcome ten percent",
    discount_percent: 10,
    remaining: 5,
    max_per_user: 2,
    expires_at: "2027-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    _id: "c2",
    code: "FLASH50",
    title: "Flash fifty",
    discount_percent: 50,
    remaining: 1,
    max_per_user: 1,
    expires_at: "2027-06-01T00:00:00.000Z",
    status: "active",
  },
  {
    _id: "c3",
    code: "OLDIE20",
    title: "Expired twenty",
    discount_percent: 20,
    remaining: 3,
    max_per_user: 1,
    expires_at: "2020-01-01T00:00:00.000Z",
    status: "expired",
  },
  {
    _id: "c4",
    code: "GONE15",
    title: "Exhausted fifteen",
    discount_percent: 15,
    remaining: 0,
    max_per_user: 1,
    expires_at: "2027-01-01T00:00:00.000Z",
    status: "exhausted",
  },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("coupons").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded coupons. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("coupon redeem API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("coupons").deleteMany({});
    await db.collection("redemptions").deleteMany({});
    await db.collection("idempotency_keys").deleteMany({});
    await db.collection<CouponRecord>("coupons").insertMany(fixtureCoupons);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/coupons returns coupons ordered by code", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/coupons").expect(200);
    expectJsonEqual(
      response.body.map((c: { code: string }) => c.code),
      ["FLASH50", "GONE15", "OLDIE20", "WELCOME10"],
    );
  });

  test("[API] GET /api/coupons filters by status", async () => {
    const app = await createApp();
    const response = await request(app)
      .get("/api/coupons")
      .query({ status: "active" })
      .expect(200);
    expectJsonEqual(
      response.body.map((c: { _id: string }) => c._id).sort(),
      ["c1", "c2"],
    );
  });

  test("[API] GET /api/coupons returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app).get("/api/coupons").query({ status: "bogus" }).expect(400);
  });

  test("[API] GET /api/coupons/summary returns status and redemption counts", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/coupons/summary").expect(200);
    const expected = { active: 2, expired: 1, exhausted: 1, redemptions: 0 };
    expectJsonMatch(response.body, expected);
  });

  test("[API] POST /api/coupons/redeem redeems an active coupon", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-welcome-1")
      .send({ code: "WELCOME10", user_id: "u1" })
      .expect(200);

    expectJsonMatch(response.body, {
      code: "WELCOME10",
      user_id: "u1",
      discount_percent: 10,
      coupon_id: "c1",
      idempotency_key: "key-welcome-1",
    });
  });

  test("[API] POST /api/coupons/redeem replays the same Idempotency-Key", async () => {
    const app = await createApp();
    const first = await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-replay")
      .send({ code: "WELCOME10", user_id: "u1" })
      .expect(200);

    const second = await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-replay")
      .send({ code: "WELCOME10", user_id: "u1" })
      .expect(200);

    expectJsonMatch(second.body, {
      _id: first.body._id,
      idempotency_key: "key-replay",
    }, {
      firstResponse: first.body,
    });
  });

  test("[API] POST /api/coupons/redeem returns 422 when Idempotency-Key body differs", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-mismatch")
      .send({ code: "WELCOME10", user_id: "u1" })
      .expect(200);

    await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-mismatch")
      .send({ code: "FLASH50", user_id: "u1" })
      .expect(422);
  });

  test("[API] POST /api/coupons/redeem returns 422 when the coupon is exhausted", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-gone")
      .send({ code: "GONE15", user_id: "u1" })
      .expect(422);
  });

  test("[API] POST /api/coupons/redeem returns 422 when the coupon is expired", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-old")
      .send({ code: "OLDIE20", user_id: "u1" })
      .expect(422);
  });

  test("[API] POST /api/coupons/redeem returns 400 without Idempotency-Key", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/coupons/redeem")
      .send({ code: "WELCOME10", user_id: "u1" })
      .expect(400);
  });

  test("[API] POST /api/coupons/redeem returns 404 for an unknown code", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/coupons/redeem")
      .set("Idempotency-Key", "key-missing")
      .send({ code: "NOPE", user_id: "u1" })
      .expect(404);
  });
});
