import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { LeaveBalance, LeaveRequest, LeaveUser } from "../../shared/types.ts";

const fixtureUsers: LeaveUser[] = [
  { _id: "u1", display_name: "Ava Employee", role: "employee" },
  { _id: "u2", display_name: "Morgan Manager", role: "manager" },
  { _id: "u3", display_name: "Sam Employee", role: "employee" },
];

const fixtureBalances: LeaveBalance[] = [
  { _id: "bal-u1", user_id: "u1", annual_days: 20, sick_days: 10 },
  { _id: "bal-u3", user_id: "u3", annual_days: 15, sick_days: 5 },
];

const fixtureRequests: LeaveRequest[] = [
  {
    _id: "lr1",
    user_id: "u1",
    user_name: "Ava Employee",
    type: "annual",
    status: "pending",
    start_date: "2026-09-01",
    end_date: "2026-09-03",
    days: 3,
    notes: "Family trip",
    version: 1,
    updated_at: "2026-08-01T12:00:00.000Z",
    reviewed_by_id: null,
    reviewed_at: null,
  },
  {
    _id: "lr2",
    user_id: "u1",
    user_name: "Ava Employee",
    type: "sick",
    status: "approved",
    start_date: "2026-08-10",
    end_date: "2026-08-10",
    days: 1,
    notes: "Flu",
    version: 2,
    updated_at: "2026-08-01T12:10:00.000Z",
    reviewed_by_id: "u2",
    reviewed_at: "2026-08-01T12:10:00.000Z",
  },
  {
    _id: "lr3",
    user_id: "u3",
    user_name: "Sam Employee",
    type: "unpaid",
    status: "pending",
    start_date: "2026-09-05",
    end_date: "2026-09-06",
    days: 2,
    notes: "Personal",
    version: 1,
    updated_at: "2026-08-01T12:20:00.000Z",
    reviewed_by_id: null,
    reviewed_at: null,
  },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("users").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded users. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

async function resetFixtures() {
  const db = await getDb();
  await db.collection("users").deleteMany({});
  await db.collection("leave_balances").deleteMany({});
  await db.collection("leave_requests").deleteMany({});
  await db.collection<LeaveUser>("users").insertMany(fixtureUsers);
  await db.collection<LeaveBalance>("leave_balances").insertMany(fixtureBalances);
  await db.collection<LeaveRequest>("leave_requests").insertMany(fixtureRequests);
}

describe("leave desk API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/users returns seeded users ordered by display_name", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/users").expect(200);
    expect(response.body.map((user: { _id: string }) => user._id)).toEqual([
      "u1",
      "u2",
      "u3",
    ]);
  });

  test("[API] GET /api/leave-balance returns the balance for a user", async () => {
    const app = await createApp();
    const response = await request(app)
      .get("/api/leave-balance")
      .query({ user_id: "u1" })
      .expect(200);
    const expected = {
      _id: "bal-u1",
      user_id: "u1",
      annual_days: 20,
      sick_days: 10,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);

    // User exists but has no leave_balances row → 200 with zeros (not 404).
    const managerBalance = await request(app)
      .get("/api/leave-balance")
      .query({ user_id: "u2" })
      .expect(200);
    expect(managerBalance.body).toMatchObject({
      user_id: "u2",
      annual_days: 0,
      sick_days: 0,
    });

    await request(app).get("/api/leave-balance").query({ user_id: "missing" }).expect(404);
  });

  test("[API] GET /api/leave-requests returns requests ordered by start_date then _id", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/leave-requests").expect(200);
    expect(response.body.map((item: { _id: string }) => item._id)).toEqual([
      "lr2",
      "lr1",
      "lr3",
    ]);
  });

  test("[API] GET /api/leave-requests filters by status and user_id", async () => {
    const app = await createApp();
    const response = await request(app)
      .get("/api/leave-requests")
      .query({ status: "pending", user_id: "u1" })
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe("lr1");
  });

  test("[API] POST /api/leave-requests creates a pending request", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/leave-requests")
      .send({
        user_id: "u1",
        type: "annual",
        start_date: "2026-11-01",
        end_date: "2026-11-02",
        notes: "Long weekend",
      })
      .expect(200);

    const expected = {
      user_id: "u1",
      user_name: "Ava Employee",
      type: "annual",
      status: "pending",
      start_date: "2026-11-01",
      end_date: "2026-11-02",
      days: 2,
      notes: "Long weekend",
      version: 1,
      reviewed_by_id: null,
      reviewed_at: null,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
    expect(response.body._id).toBeTruthy();
  });

  test("[API] POST /api/leave-requests returns 400 for invalid body or dates", async () => {
    const app = await createApp();

    const missingFields = await request(app)
      .post("/api/leave-requests")
      .send({
        user_id: "u1",
        type: "annual",
        start_date: "2026-11-01",
        notes: "Missing end",
      })
      .expect(400);
    expect(missingFields.body.message).toBeTruthy();

    const badDates = await request(app)
      .post("/api/leave-requests")
      .send({
        user_id: "u1",
        type: "annual",
        start_date: "2026-11-05",
        end_date: "2026-11-01",
        notes: "End before start",
      })
      .expect(400);
    expect(badDates.body.message).toMatch(/date/i);

    const badType = await request(app)
      .post("/api/leave-requests")
      .send({
        user_id: "u1",
        type: "vacation",
        start_date: "2026-11-01",
        end_date: "2026-11-02",
        notes: "Bad type",
      })
      .expect(400);
    expect(badType.body.message).toBeTruthy();
  });

  test("[API] POST /api/leave-requests returns 409 with conflicting_request on overlap", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/leave-requests")
      .send({
        user_id: "u1",
        type: "sick",
        start_date: "2026-09-02",
        end_date: "2026-09-04",
        notes: "Overlap",
      })
      .expect(409);

    expect(response.body.message).toMatch(/overlap/i);
    expect(response.body.conflicting_request._id).toBe("lr1");
  });

  test("[API] PATCH /api/leave-requests/:id updates a pending request and bumps version", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/leave-requests/lr1")
      .send({
        expected_version: 1,
        type: "annual",
        start_date: "2026-09-10",
        end_date: "2026-09-11",
        notes: "Moved dates",
      })
      .expect(200);

    const expected = {
      _id: "lr1",
      type: "annual",
      start_date: "2026-09-10",
      end_date: "2026-09-11",
      days: 2,
      notes: "Moved dates",
      status: "pending",
      version: 2,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
  });

  test("[API] PATCH /api/leave-requests/:id returns 412 with latest when expected_version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/leave-requests/lr1")
      .send({
        expected_version: 0,
        type: "annual",
        start_date: "2026-09-10",
        end_date: "2026-09-11",
        notes: "Stale",
      })
      .expect(412);

    expect(response.body.message).toBeTruthy();
    expect(response.body.latest._id).toBe("lr1");
    expect(response.body.latest.version).toBe(1);
  });

  test("[API] POST /api/leave-requests/:id/approve approves and deducts balance", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/leave-requests/lr1/approve")
      .send({ expected_version: 1, reviewer_id: "u2" })
      .expect(200);

    const expected = {
      _id: "lr1",
      status: "approved",
      version: 2,
      reviewed_by_id: "u2",
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
    expect(response.body.reviewed_at).toBeTruthy();

    const balance = await request(app)
      .get("/api/leave-balance")
      .query({ user_id: "u1" })
      .expect(200);
    expect(balance.body.annual_days).toBe(17);
    expect(balance.body.sick_days).toBe(10);
  });

  test("[API] POST /api/leave-requests/:id/approve returns 422 with latest when already decided", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/leave-requests/lr1/approve")
      .send({ expected_version: 1, reviewer_id: "u2" })
      .expect(200);

    const response = await request(app)
      .post("/api/leave-requests/lr1/approve")
      .send({ expected_version: 1, reviewer_id: "u2" })
      .expect(422);

    expect(response.body.message).toBeTruthy();
    expect(response.body.latest.status).toBe("approved");
    expect(response.body.latest.version).toBe(2);
  });

  test("[API] POST /api/leave-requests/:id/approve returns 422 when balance is insufficient", async () => {
    const app = await createApp();
    const db = await getDb();
    await db.collection("leave_balances").updateOne(
      { user_id: "u1" },
      { $set: { annual_days: 1 } },
    );

    const response = await request(app)
      .post("/api/leave-requests/lr1/approve")
      .send({ expected_version: 1, reviewer_id: "u2" })
      .expect(422);

    expect(response.body.message).toMatch(/insufficient leave balance/i);
    expect(response.body.latest._id).toBe("lr1");
    expect(response.body.latest.status).toBe("pending");

    const balance = await request(app)
      .get("/api/leave-balance")
      .query({ user_id: "u1" })
      .expect(200);
    expect(balance.body.annual_days).toBe(1);
  });

  test("[API] POST /api/leave-requests/:id/reject rejects a pending request", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/leave-requests/lr1/reject")
      .send({ expected_version: 1, reviewer_id: "u2" })
      .expect(200);

    const expected = {
      _id: "lr1",
      status: "rejected",
      version: 2,
      reviewed_by_id: "u2",
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);

    const balance = await request(app)
      .get("/api/leave-balance")
      .query({ user_id: "u1" })
      .expect(200);
    expect(balance.body.annual_days).toBe(20);
  });
});
