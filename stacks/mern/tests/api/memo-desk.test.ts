import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { MemoMember, MemoRecord } from "../../shared/types.ts";
import { expectJsonMatch } from "../expect-json.ts";

const fixtureMembers: MemoMember[] = [
  { _id: "m1", display_name: "Ava Owner" },
  { _id: "m2", display_name: "Ben Owner" },
];

const fixtureMemos: MemoRecord[] = [
  {
    _id: "n1",
    title: "Standup notes",
    body: "Ship filter desk first",
    status: "active",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 1,
    updated_at: "2026-08-14T10:00:00.000Z",
  },
  {
    _id: "n2",
    title: "Hiring loop",
    body: "Prefer live boards under 60m",
    status: "active",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 2,
    updated_at: "2026-08-14T09:00:00.000Z",
  },
  {
    _id: "n3",
    title: "Ben's scratch",
    body: "Private to Ben",
    status: "active",
    owner_id: "m2",
    owner_name: "Ben Owner",
    version: 1,
    updated_at: "2026-08-14T08:00:00.000Z",
  },
  {
    _id: "n4",
    title: "Old kickoff",
    body: "Archived on purpose",
    status: "archived",
    owner_id: "m1",
    owner_name: "Ava Owner",
    version: 3,
    updated_at: "2026-08-13T10:00:00.000Z",
  },
];

async function restoreFixtures() {
  const db = await getDb();
  await db.collection("members").deleteMany({});
  await db.collection("memos").deleteMany({});
  await db.collection<MemoMember>("members").insertMany(fixtureMembers);
  await db.collection<MemoRecord>("memos").insertMany(fixtureMemos);
}

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("memos").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded memos. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("memo desk API", () => {
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

  test("[API] GET /api/memos filters by status", async () => {
    const app = await createApp();
    const active = await request(app)
      .get("/api/memos")
      .query({ status: "active" })
      .expect(200);

    expect(active.body.map((memo: { _id: string }) => memo._id)).toEqual([
      "n1",
      "n2",
      "n3",
    ]);

    const all = await request(app).get("/api/memos").expect(200);
    expect(all.body.map((memo: { _id: string }) => memo._id)).toEqual([
      "n1",
      "n2",
      "n3",
      "n4",
    ]);
  });

  test("[API] GET /api/memos returns 400 for an invalid status", async () => {
    const app = await createApp();
    await request(app)
      .get("/api/memos")
      .query({ status: "nope" })
      .expect(400);
  });

  test("[API] GET /api/memos/summary counts by status", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/memos/summary").expect(200);
    expectJsonMatch(response.body, { active: 3, archived: 1 });
  });

  test("[API] PATCH /api/memos/:id updates body when owner and version match", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/memos/n1")
      .send({
        owner_id: "m1",
        expected_version: 1,
        body: "Updated standup",
      })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "n1",
      body: "Updated standup",
      status: "active",
      version: 2,
      owner_id: "m1",
    });
  });

  test("[API] PATCH returns 412 with latest when the version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/memos/n1")
      .send({
        owner_id: "m1",
        expected_version: 99,
        body: "Nope",
      })
      .expect(412);

    expect(response.body.latest._id).toBe("n1");
    expect(response.body.latest.version).toBe(1);
    expect(response.body.latest.status).toBe("active");
  });

  test("[API] PATCH returns 410 with latest when archived (even if version is stale)", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/memos/n4")
      .send({
        owner_id: "m1",
        expected_version: 99,
        body: "Nope",
      })
      .expect(410);

    expect(response.body.latest._id).toBe("n4");
    expect(response.body.latest.status).toBe("archived");
    expect(response.body.latest.version).toBe(3);
  });

  test("[API] PATCH returns 403 when owner_id is not the memo owner", async () => {
    const app = await createApp();
    await request(app)
      .patch("/api/memos/n1")
      .send({
        owner_id: "m2",
        expected_version: 1,
        body: "Stolen",
      })
      .expect(403);
  });

  test("[API] POST /api/memos/:id/archive archives an active memo", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/memos/n1/archive")
      .send({ owner_id: "m1", expected_version: 1 })
      .expect(200);

    expectJsonMatch(response.body, {
      _id: "n1",
      status: "archived",
      version: 2,
    });

    const summary = await request(app).get("/api/memos/summary").expect(200);
    expectJsonMatch(summary.body, { active: 2, archived: 2 });
  });
});
