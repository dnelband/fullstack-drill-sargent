import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import { SEAT_HOLD_TTL_MS } from "../../shared/seat-hold.ts";
import type { SeatMember, SeatRecord } from "../../shared/types.ts";
import { expectJsonMatch } from "../expect-json.ts";

const fixtureMembers: SeatMember[] = [
  { _id: "m1", display_name: "Ava Buyer" },
  { _id: "m2", display_name: "Ben Buyer" },
];

const fixtureSeats: SeatRecord[] = [
  {
    _id: "s1",
    section: "Orchestra",
    label: "A1",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
  },
  {
    _id: "s2",
    section: "Orchestra",
    label: "A2",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
  },
  {
    _id: "s3",
    section: "Orchestra",
    label: "B1",
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Buyer",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Paid deposit",
    version: 2,
  },
  {
    _id: "s4",
    section: "Balcony",
    label: "C1",
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Buyer",
    held_until: "2020-01-01T00:00:00.000Z",
    notes: "Expired hold",
    version: 2,
  },
  {
    _id: "s5",
    section: "Balcony",
    label: "C2",
    status: "held",
    held_by_id: "m1",
    held_by_name: "Ava Buyer",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Aisle preference",
    version: 3,
  },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("seats").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded seats. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("seat hold API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("members").deleteMany({});
    await db.collection("seats").deleteMany({});
    await db.collection<SeatMember>("members").insertMany(fixtureMembers);
    await db.collection<SeatRecord>("seats").insertMany(fixtureSeats);
  });

  // Restore fixtures after each test too — otherwise the 410 test leaves s5 expired
  // in practice_seat_hold and Compass/manual curls look "wrong" vs seed.
  afterEach(async () => {
    const db = await getDb();
    await db.collection("members").deleteMany({});
    await db.collection("seats").deleteMany({});
    await db.collection<SeatMember>("members").insertMany(fixtureMembers);
    await db.collection<SeatRecord>("seats").insertMany(fixtureSeats);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/seats filters by effective status (expired holds count as open)", async () => {
    const app = await createApp();
    const open = await request(app)
      .get("/api/seats")
      .query({ status: "open" })
      .expect(200);

    expect(open.body.map((seat: { _id: string }) => seat._id)).toEqual([
      "s4",
      "s1",
      "s2",
    ]);

    const held = await request(app)
      .get("/api/seats")
      .query({ status: "held" })
      .expect(200);
    expect(held.body.map((seat: { _id: string }) => seat._id)).toEqual([
      "s5",
      "s3",
    ]);
  });

  test("[API] GET /api/seats returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app).get("/api/seats").query({ status: "sold" }).expect(400);
  });

  test("[API] GET /api/seats/summary counts expired holds as open", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/seats/summary").expect(200);
    // s1,s2 open + s4 expired-held → open 3; s3,s5 active → held 2
    expectJsonMatch(response.body, { open: 3, held: 2 });
  });

  test("[API] POST /api/seats/:id/hold holds an available seat", async () => {
    const app = await createApp();
    const before = Date.now();
    const response = await request(app)
      .post("/api/seats/s1/hold")
      .send({ member_id: "m1" })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "s1",
      status: "held",
      held_by_id: "m1",
      held_by_name: "Ava Buyer",
      version: 2,
    });

    const heldUntil = Date.parse(String(response.body.held_until));
    expect(Number.isFinite(heldUntil)).toBe(true);
    expect(heldUntil).toBeGreaterThanOrEqual(before + SEAT_HOLD_TTL_MS - 5_000);
    expect(heldUntil).toBeLessThanOrEqual(Date.now() + SEAT_HOLD_TTL_MS + 5_000);
  });

  test("[API] POST /api/seats/:id/hold returns 409 with latest when actively held", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/seats/s3/hold")
      .send({ member_id: "m1" })
      .expect(409);

    expect(response.body.message).toMatch(/actively held|already held|no longer available/i);
    expectJsonMatch(response.body.latest, {
      _id: "s3",
      status: "held",
      held_by_id: "m2",
      held_by_name: "Ben Buyer",
    });
  });

  test("[API] Concurrent hold requests allow exactly one winner for the same seat", async () => {
    const app = await createApp();
    const [first, second] = await Promise.all([
      request(app).post("/api/seats/s1/hold").send({ member_id: "m1" }),
      request(app).post("/api/seats/s1/hold").send({ member_id: "m2" }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = first.status === 200 ? first : second;
    const loser = first.status === 409 ? first : second;
    expectJsonMatch(winner.body, { _id: "s1", status: "held" });
    expectJsonMatch(loser.body.latest, {
      _id: "s1",
      status: "held",
      held_by_id: winner.body.held_by_id,
    });
  });

  test("[API] PATCH /api/seats/:id updates notes when the hold is active and version matches", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/seats/s5")
      .send({
        member_id: "m1",
        expected_version: 3,
        notes: "Window side",
      })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "s5",
      notes: "Window side",
      version: 4,
      held_by_id: "m1",
      status: "held",
    });
  });

  test("[API] PATCH /api/seats/:id returns 412 with latest when the version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/seats/s5")
      .send({
        member_id: "m1",
        expected_version: 1,
        notes: "stale",
      })
      .expect(412);

    expectJsonMatch(response.body.latest, {
      _id: "s5",
      version: 3,
      notes: "Aisle preference",
    });
  });

  test("[API] PATCH /api/seats/:id returns 410 with latest when the hold expired", async () => {
    const db = await getDb();
    const update = await db.collection("seats").updateOne(
      { _id: "s5" },
      { $set: { held_until: "2020-01-01T00:00:00.000Z" } },
    );
    expect(update.matchedCount).toBe(1);

    const app = await createApp();
    const response = await request(app)
      .patch("/api/seats/s5")
      .send({
        member_id: "m1",
        expected_version: 3,
        notes: "too late",
      })
      .expect(410);

    expectJsonMatch(response.body.latest, {
      _id: "s5",
      held_until: "2020-01-01T00:00:00.000Z",
      notes: "Aisle preference",
    });
  });
});
