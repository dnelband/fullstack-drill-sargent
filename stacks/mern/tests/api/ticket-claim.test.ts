import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { TicketMember, TicketRecord } from "../../shared/types.ts";

const fixtureMembers: TicketMember[] = [
  { _id: "m1", display_name: "Ava Agent" },
  { _id: "m2", display_name: "Ben Agent" },
];

const fixtureTickets: TicketRecord[] = [
  {
    _id: "t1",
    title: "Password reset loop",
    priority: "high",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T14:00:00.000Z",
  },
  {
    _id: "t2",
    title: "Invoice PDF blank",
    priority: "medium",
    status: "open",
    claimed_by_id: null,
    claimed_by_name: null,
    created_at: "2026-08-11T13:00:00.000Z",
  },
  {
    _id: "t3",
    title: "SSO timeout",
    priority: "high",
    status: "claimed",
    claimed_by_id: "m2",
    claimed_by_name: "Ben Agent",
    created_at: "2026-08-11T12:00:00.000Z",
  },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("tickets").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded tickets. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("ticket claim API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("members").deleteMany({});
    await db.collection("tickets").deleteMany({});
    await db.collection<TicketMember>("members").insertMany(fixtureMembers);
    await db.collection<TicketRecord>("tickets").insertMany(fixtureTickets);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/tickets returns tickets ordered by created_at desc", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/tickets").expect(200);
    expect(response.body.map((t: { _id: string }) => t._id)).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
  });

  test("[API] GET /api/tickets filters by status", async () => {
    const app = await createApp();
    const response = await request(app)
      .get("/api/tickets")
      .query({ status: "open" })
      .expect(200);
    expect(response.body.map((t: { _id: string }) => t._id)).toEqual(["t1", "t2"]);
  });

  test("[API] GET /api/tickets returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app).get("/api/tickets").query({ status: "done" }).expect(400);
  });

  test("[API] GET /api/tickets/summary returns open and claimed counts", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/tickets/summary").expect(200);
    const expected = { open: 2, claimed: 1 };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
  });

  test("[API] POST /api/tickets/:id/claim claims an open ticket", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/tickets/t1/claim")
      .send({ member_id: "m1" })
      .expect(200);

    const expected = {
      _id: "t1",
      title: "Password reset loop",
      status: "claimed",
      claimed_by_id: "m1",
      claimed_by_name: "Ava Agent",
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);

    const listed = await request(app).get("/api/tickets").query({ status: "claimed" }).expect(200);
    const persisted = listed.body.find((t: { _id: string }) => t._id === "t1");
    expect(
      persisted,
      `list after claim actual=${JSON.stringify(listed.body, null, 2)}`,
    ).toMatchObject({
      _id: "t1",
      status: "claimed",
      claimed_by_id: "m1",
      claimed_by_name: "Ava Agent",
    });

    const summary = await request(app).get("/api/tickets/summary").expect(200);
    expect(summary.body).toMatchObject({ open: 1, claimed: 2 });
  });

  test("[API] POST /api/tickets/:id/claim returns 409 with latest when already claimed", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/tickets/t3/claim")
      .send({ member_id: "m1" })
      .expect(409);

    expect(response.body.message).toMatch(/no longer open/i);
    expect(response.body.latest).toMatchObject({
      _id: "t3",
      status: "claimed",
      claimed_by_id: "m2",
      claimed_by_name: "Ben Agent",
    });
  });
});
