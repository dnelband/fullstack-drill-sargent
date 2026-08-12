import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import { HOLD_TTL_MS } from "../../shared/hold-queue.ts";
import type { HoldQueueItem, HoldQueueMember } from "../../shared/types.ts";
import { expectJsonMatch } from "../expect-json.ts";

const fixtureMembers: HoldQueueMember[] = [
  { _id: "m1", display_name: "Ava Agent" },
  { _id: "m2", display_name: "Ben Agent" },
];

const fixtureItems: HoldQueueItem[] = [
  {
    _id: "q1",
    title: "Printer jam floor 2",
    priority: "high",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T14:00:00.000Z",
  },
  {
    _id: "q2",
    title: "Badge reader offline",
    priority: "medium",
    status: "open",
    held_by_id: null,
    held_by_name: null,
    held_until: null,
    notes: "",
    version: 1,
    created_at: "2026-08-12T13:00:00.000Z",
  },
  {
    _id: "q3",
    title: "HVAC alert wing B",
    priority: "high",
    status: "held",
    held_by_id: "m2",
    held_by_name: "Ben Agent",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Waiting on facilities",
    version: 2,
    created_at: "2026-08-12T12:00:00.000Z",
  },
  {
    _id: "q5",
    title: "Conference dial-in noise",
    priority: "medium",
    status: "held",
    held_by_id: "m1",
    held_by_name: "Ava Agent",
    held_until: "2099-01-01T00:00:00.000Z",
    notes: "Testing mics",
    version: 3,
    created_at: "2026-08-12T10:00:00.000Z",
  },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("queue_items").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded queue_items. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("hold queue API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("members").deleteMany({});
    await db.collection("queue_items").deleteMany({});
    await db.collection<HoldQueueMember>("members").insertMany(fixtureMembers);
    await db.collection<HoldQueueItem>("queue_items").insertMany(fixtureItems);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/queue returns items ordered by created_at desc", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/queue").expect(200);
    expect(response.body.map((item: { _id: string }) => item._id)).toEqual([
      "q1",
      "q2",
      "q3",
      "q5",
    ]);
  });

  test("[API] GET /api/queue filters by effective status", async () => {
    const app = await createApp();
    const open = await request(app)
      .get("/api/queue")
      .query({ status: "open" })
      .expect(200);
    expect(open.body.map((item: { _id: string }) => item._id)).toEqual([
      "q1",
      "q2",
    ]);

    const held = await request(app)
      .get("/api/queue")
      .query({ status: "held" })
      .expect(200);
    expect(held.body.map((item: { _id: string }) => item._id).sort()).toEqual([
      "q3",
      "q5",
    ]);
  });

  test("[API] GET /api/queue returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app).get("/api/queue").query({ status: "done" }).expect(400);
  });

  test("[API] GET /api/queue/summary returns open and held counts", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/queue/summary").expect(200);
    expectJsonMatch(response.body, { open: 2, held: 2 });
  });

  test("[API] POST /api/queue/:id/hold holds an available item", async () => {
    const app = await createApp();
    const before = Date.now();
    const response = await request(app)
      .post("/api/queue/q1/hold")
      .send({ member_id: "m1" })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "q1",
      status: "held",
      held_by_id: "m1",
      held_by_name: "Ava Agent",
      version: 2,
    });

    const heldUntil = Date.parse(String(response.body.held_until));
    expect(Number.isFinite(heldUntil)).toBe(true);
    expect(heldUntil).toBeGreaterThanOrEqual(before + HOLD_TTL_MS - 5_000);
    expect(heldUntil).toBeLessThanOrEqual(Date.now() + HOLD_TTL_MS + 5_000);
  });

  test("[API] POST /api/queue/:id/hold returns 409 with latest when actively held", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/queue/q3/hold")
      .send({ member_id: "m1" })
      .expect(409);

    expect(response.body.message).toMatch(/actively held|no longer available|already held/i);
    expectJsonMatch(response.body.latest, {
      _id: "q3",
      status: "held",
      held_by_id: "m2",
      held_by_name: "Ben Agent",
    });
  });

  test("[API] POST /api/queue/:id/hold succeeds when the previous hold expired", async () => {
    const db = await getDb();
    const update = await db.collection("queue_items").updateOne(
      { _id: "q3" },
      {
        $set: {
          held_until: "2020-01-01T00:00:00.000Z",
        },
      },
    );
    expect(update.matchedCount).toBe(1);

    const app = await createApp();
    const response = await request(app)
      .post("/api/queue/q3/hold")
      .send({ member_id: "m1" })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "q3",
      status: "held",
      held_by_id: "m1",
      held_by_name: "Ava Agent",
    });
  });

  test("[API] PATCH /api/queue/:id updates notes when the hold is active and version matches", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/queue/q5")
      .send({
        member_id: "m1",
        expected_version: 3,
        notes: "Replaced headset",
      })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "q5",
      notes: "Replaced headset",
      version: 4,
      held_by_id: "m1",
      status: "held",
    });
  });

  test("[API] PATCH /api/queue/:id returns 412 with latest when the version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/queue/q5")
      .send({
        member_id: "m1",
        expected_version: 1,
        notes: "stale write",
      })
      .expect(412);

    expectJsonMatch(response.body.latest, {
      _id: "q5",
      version: 3,
      notes: "Testing mics",
      held_by_id: "m1",
    });
  });

  test("[API] PATCH /api/queue/:id returns 410 with latest when the hold expired", async () => {
    const db = await getDb();
    const update = await db.collection("queue_items").updateOne(
      { _id: "q5" },
      { $set: { held_until: "2020-01-01T00:00:00.000Z" } },
    );
    expect(update.matchedCount).toBe(1);

    const app = await createApp();
    const response = await request(app)
      .patch("/api/queue/q5")
      .send({
        member_id: "m1",
        expected_version: 3,
        notes: "too late",
      })
      .expect(410);

    expectJsonMatch(response.body.latest, {
      _id: "q5",
      held_until: "2020-01-01T00:00:00.000Z",
      notes: "Testing mics",
    });
  });
});
