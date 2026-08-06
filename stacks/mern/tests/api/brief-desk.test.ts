import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";

async function assertSeededDatabase() {
  const db = await getDb();
  const members = await db.collection("members").countDocuments();
  const briefs = await db.collection("briefs").countDocuments();
  if (members === 0 || briefs === 0) {
    throw new Error(
      "Challenge collections are empty. Run `pnpm db:prepare` once before the API tests.",
    );
  }
}

async function resetBriefsUsedByTests() {
  const db = await getDb();
  const now = new Date().toISOString();
  const briefs = db.collection("briefs");
  await briefs.bulkWrite([
    {
      updateOne: {
        filter: { _id: "b1" } as never,
        update: {
          $set: {
            status: "open",
            assigned_member_id: null,
            notes: "Legal needs the APY copy updated before the campaign launch.",
            version: 1,
            updated_at: now,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: "b2" } as never,
        update: {
          $set: {
            status: "open",
            assigned_member_id: null,
            notes: "Replace the placeholder art with the approved mascot set.",
            version: 1,
            updated_at: now,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: "b5" } as never,
        update: {
          $set: {
            status: "open",
            assigned_member_id: null,
            notes: "Reproduced on iPhone 14 Safari only.",
            version: 1,
            updated_at: now,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: "b8" } as never,
        update: {
          $set: {
            status: "claimed",
            assigned_member_id: "m1",
            notes: "Subject line A/B variants are in the ticket.",
            version: 2,
            updated_at: now,
          },
        },
      },
    },
  ]);
}

function assertBriefsArray(body: unknown) {
  if (!Array.isArray(body)) {
    throw new Error("GET /api/briefs must return a bare array of briefs.");
  }
  return body as Array<{
    _id: string;
    status: string;
    priority: "high" | "medium" | "low";
    due_at: string;
    client_name?: string;
    assigned_member_id?: string | null;
    version?: number;
    notes?: string;
  }>;
}

describe("brief desk API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    await resetBriefsUsedByTests();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/members returns all seeded members ordered by display_name", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/members").expect(200);

    expect(response.body).toHaveLength(6);
    expect(response.body.map((member: { display_name: string }) => member.display_name)).toEqual([
      "Ava Chen",
      "Ben Ortiz",
      "Cara Nilsen",
      "Devon Blake",
      "Elena Vogt",
      "Farah Haddad",
    ]);
  });

  test("[API] GET /api/briefs defaults to status open when no status query is provided", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/briefs").expect(200);
    const briefs = assertBriefsArray(response.body);
    expect(briefs.length).toBeGreaterThan(0);
    expect(briefs.every((brief) => brief.status === "open")).toBe(true);
  });

  test("[API] GET /api/briefs orders results by priority then due_at", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/briefs?status=open").expect(200);
    const briefs = assertBriefsArray(response.body);
    const rank = { high: 1, medium: 2, low: 3 };

    for (let index = 1; index < briefs.length; index += 1) {
      const prev = briefs[index - 1];
      const curr = briefs[index];
      const priorityDelta = rank[prev.priority] - rank[curr.priority];
      expect(priorityDelta).toBeLessThanOrEqual(0);
      if (priorityDelta === 0) {
        expect(new Date(prev.due_at).getTime()).toBeLessThanOrEqual(new Date(curr.due_at).getTime());
      }
    }
  });

  test("[API] GET /api/briefs filters by status, assignee, and search text", async () => {
    const app = await createApp();

    const claimed = assertBriefsArray(
      (await request(app).get("/api/briefs?status=claimed").expect(200)).body,
    );
    expect(claimed.every((brief) => brief.status === "claimed")).toBe(true);

    const byMember = assertBriefsArray(
      (await request(app).get("/api/briefs?status=all&assigned_member_id=m1").expect(200)).body,
    );
    expect(byMember.every((brief) => brief.assigned_member_id === "m1")).toBe(true);

    const search = assertBriefsArray(
      (await request(app).get("/api/briefs?status=all&search=orbit").expect(200)).body,
    );
    expect(search.some((brief) => brief.client_name === "Orbit Travel")).toBe(true);
  });

  test("[API] POST /api/briefs/:id/claim assigns an open brief and increments its version", async () => {
    const app = await createApp();
    const list = assertBriefsArray((await request(app).get("/api/briefs").expect(200)).body);
    const target = list.find((brief) => brief._id === "b1");
    expect(target).toBeTruthy();

    const response = await request(app)
      .post(`/api/briefs/${target!._id}/claim`)
      .send({ member_id: "m1" })
      .expect(200);

    const expected = {
      _id: "b1",
      status: "claimed",
      assigned_member_id: "m1",
      assigned_member_name: "Ava Chen",
      version: Number(target!.version) + 1,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
  });

  test("[API] POST /api/briefs/:id/claim rejects a second claim for the same brief", async () => {
    const app = await createApp();
    await request(app).post("/api/briefs/b1/claim").send({ member_id: "m1" }).expect(200);
    const second = await request(app)
      .post("/api/briefs/b1/claim")
      .send({ member_id: "m2" })
      .expect(409);
    expect(second.body.message).toBe("Brief is no longer open.");
  });

  test("[API] Concurrent claim requests allow exactly one winner for the same brief", async () => {
    const app = await createApp();
    const [winner, loser] = await Promise.all([
      request(app).post("/api/briefs/b2/claim").send({ member_id: "m1" }),
      request(app).post("/api/briefs/b2/claim").send({ member_id: "m2" }),
    ]);
    expect([winner.status, loser.status].sort()).toEqual([200, 409]);
  });

  test("[API] PATCH /api/briefs/:id updates notes and status and increments version when the expected version matches", async () => {
    const app = await createApp();
    const claimed = await request(app)
      .post("/api/briefs/b1/claim")
      .send({ member_id: "m1" })
      .expect(200);

    const response = await request(app)
      .patch("/api/briefs/b1")
      .send({
        expected_version: claimed.body.version,
        status: "completed",
        notes: "Shipped after client sign-off on the rate table.",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      status: "completed",
      notes: "Shipped after client sign-off on the rate table.",
      version: Number(claimed.body.version) + 1,
    });
  });

  test("[API] PATCH /api/briefs/:id returns 409 with message and latest brief when a stale version is submitted", async () => {
    const app = await createApp();
    const claimed = await request(app)
      .post("/api/briefs/b1/claim")
      .send({ member_id: "m1" })
      .expect(200);

    await request(app)
      .patch("/api/briefs/b1")
      .send({
        expected_version: claimed.body.version,
        status: "completed",
        notes: "First save wins.",
      })
      .expect(200);

    const stale = await request(app)
      .patch("/api/briefs/b1")
      .send({
        expected_version: claimed.body.version,
        status: "claimed",
        notes: "Outdated browser tab",
      })
      .expect(409);

    expect(stale.body.message).toMatch(/stale/i);
    expect(stale.body.latest).toMatchObject({
      status: "completed",
      notes: "First save wins.",
    });
  });
});
