import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closePool, pool } from "../../server/db.ts";

async function assertSeededDatabase() {
  const agents = await pool.query(`SELECT COUNT(*)::int AS count FROM agents`);
  const callbacks = await pool.query(
    `SELECT COUNT(*)::int AS count FROM callbacks`,
  );

  if (agents.rows[0]?.count === 0 || callbacks.rows[0]?.count === 0) {
    throw new Error(
      "Challenge tables are empty. Run `pnpm db:prepare` once before the API tests; the suite does not seed the database.",
    );
  }
}

async function resetCallbacksUsedByTests() {
  await pool.query(
    `
      UPDATE callbacks
      SET status = CASE customer_name
        WHEN 'Acme Logistics' THEN 'open'
        WHEN 'Blue Harbor Hotels' THEN 'open'
        WHEN 'Delta Home Goods' THEN 'open'
        WHEN 'Golden State Repairs' THEN 'open'
        WHEN 'Harborlight Schools' THEN 'claimed'
        ELSE status
      END,
      assigned_agent_id = CASE customer_name
        WHEN 'Acme Logistics' THEN NULL
        WHEN 'Blue Harbor Hotels' THEN NULL
        WHEN 'Delta Home Goods' THEN NULL
        WHEN 'Golden State Repairs' THEN NULL
        WHEN 'Harborlight Schools' THEN 'a3'
        ELSE assigned_agent_id
      END,
      notes = CASE customer_name
        WHEN 'Acme Logistics' THEN 'Customer is waiting for a corrected invoice before noon.'
        WHEN 'Blue Harbor Hotels' THEN 'Call before next guest transfer window.'
        WHEN 'Delta Home Goods' THEN 'Warehouse requested escalation if unresolved today.'
        WHEN 'Golden State Repairs' THEN 'Must be reassigned today.'
        WHEN 'Harborlight Schools' THEN 'Family decision deadline is in two hours.'
        ELSE notes
      END,
      version = 1,
      updated_at = NOW()
      WHERE customer_name IN (
        'Acme Logistics',
        'Blue Harbor Hotels',
        'Delta Home Goods',
        'Golden State Repairs',
        'Harborlight Schools'
      );
    `,
  );
}

function assertCallbacksArray(body: unknown) {
  if (!Array.isArray(body)) {
    throw new Error(
      "GET /api/callbacks must return a bare array of callbacks. Summary lives on GET /api/summary.",
    );
  }

  return body as Array<{
    id: number;
    status: string;
    priority: "high" | "medium" | "low";
    scheduled_for: string;
    customer_name?: string;
    assigned_agent_id?: string | null;
    version?: number;
  }>;
}

describe("dispatch board API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    await resetCallbacksUsedByTests();
  });

  afterAll(async () => {
    await closePool();
  });

  test("[API] GET /api/agents returns all seeded agents ordered by display_name", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/agents").expect(200);

    expect(response.body).toHaveLength(6);
    expect(
      response.body.map(
        (agent: { display_name: string }) => agent.display_name,
      ),
    ).toEqual([
      "Amina Yusuf",
      "Iris Zhang",
      "Jonas Fischer",
      "Lea Martin",
      "Marco Silva",
      "Nina Patel",
    ]);
  });

  test("[API] GET /api/callbacks defaults to status open when no status query is provided", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/callbacks").expect(200);
    const items = assertCallbacksArray(response.body);

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.status === "open")).toBe(true);
  });

  test("[API] GET /api/callbacks orders results by priority then scheduled_for", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/callbacks").expect(200);
    const items = assertCallbacksArray(response.body);

    expect(items.length).toBeGreaterThan(1);

    const priorityRank = { high: 1, medium: 2, low: 3 } as const;
    for (let index = 1; index < items.length; index += 1) {
      const previous = items[index - 1];
      const current = items[index];
      const previousRank = priorityRank[previous.priority];
      const currentRank = priorityRank[current.priority];

      expect(previousRank).toBeLessThanOrEqual(currentRank);
      if (previousRank === currentRank) {
        expect(new Date(previous.scheduled_for).getTime()).toBeLessThanOrEqual(
          new Date(current.scheduled_for).getTime(),
        );
      }
    }
  });

  test("[API] GET /api/callbacks filters by status, assignee, and search text", async () => {
    const app = await createApp();
    const response = await request(app)
      .get("/api/callbacks")
      .query({
        status: "claimed",
        assigned_agent_id: "a3",
        search: "overbooking",
      })
      .expect(200);
    const items = assertCallbacksArray(response.body);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      customer_name: "Harborlight Schools",
      assigned_agent_id: "a3",
      status: "claimed",
    });
  });

  test("[API] POST /api/callbacks/:id/claim assigns an open callback and increments its version", async () => {
    const app = await createApp();
    const before = assertCallbacksArray(
      (await request(app).get("/api/callbacks").expect(200)).body,
    );
    const target = before[0];
    const currentVersionResult = await pool.query<{ version: number | string }>(
      `SELECT version FROM callbacks WHERE id = $1`,
      [target.id],
    );
    const currentVersion = Number(currentVersionResult.rows[0]?.version);

    const response = await request(app)
      .post(`/api/callbacks/${target.id}/claim`)
      .send({ agent_id: "a1" })
      .expect(200);

    const expected = {
      id: target.id,
      status: "claimed",
      assigned_agent_id: "a1",
      assigned_agent_name: "Nina Patel",
      version: currentVersion + 1,
    };
    const detail =
      `currentVersion=${currentVersion}; ` +
      `actual.version=${JSON.stringify(response.body?.version)} (${typeof response.body?.version}); ` +
      `actual=${JSON.stringify(response.body)}; expected=${JSON.stringify(expected)}`;

    expect(response.body, detail).toMatchObject(expected);
  });

  test("[API] POST /api/callbacks/:id/claim rejects a second claim for the same callback", async () => {
    const app = await createApp();
    const firstList = assertCallbacksArray(
      (await request(app).get("/api/callbacks").expect(200)).body,
    );
    const target = firstList[0];

    await request(app)
      .post(`/api/callbacks/${target.id}/claim`)
      .send({ agent_id: "a1" })
      .expect(200);
    const second = await request(app)
      .post(`/api/callbacks/${target.id}/claim`)
      .send({ agent_id: "a2" })
      .expect(409);

    expect(second.body.message).toBe("Callback is no longer open.");
  });

  test("[API] Concurrent claim requests allow exactly one winner for the same callback", async () => {
    const app = await createApp();
    const firstList = assertCallbacksArray(
      (await request(app).get("/api/callbacks").expect(200)).body,
    );
    const target = firstList[0];

    const [winner, loser] = await Promise.all([
      request(app)
        .post(`/api/callbacks/${target.id}/claim`)
        .send({ agent_id: "a1" }),
      request(app)
        .post(`/api/callbacks/${target.id}/claim`)
        .send({ agent_id: "a2" }),
    ]);

    expect([winner.status, loser.status].sort()).toEqual([200, 409]);
  });

  test("[API] PATCH /api/callbacks/:id updates notes and status and increments version when the expected version matches", async () => {
    const app = await createApp();
    const list = assertCallbacksArray(
      (await request(app).get("/api/callbacks").expect(200)).body,
    );
    const target = list[0];
    const claimed = await request(app)
      .post(`/api/callbacks/${target.id}/claim`)
      .send({ agent_id: "a1" })
      .expect(200);

    const response = await request(app)
      .patch(`/api/callbacks/${target.id}`)
      .send({
        expected_version: claimed.body.version,
        status: "completed",
        notes: "Customer confirmed resolution during the callback.",
      })
      .expect(200);

    const expected = {
      status: "completed",
      notes: "Customer confirmed resolution during the callback.",
      version: Number(claimed.body.version) + 1,
    };
    const detail =
      `claimed.version=${JSON.stringify(claimed.body.version)} (${typeof claimed.body.version}); ` +
      `actual.version=${JSON.stringify(response.body?.version)} (${typeof response.body?.version}); ` +
      `actual=${JSON.stringify(response.body)}; expected=${JSON.stringify(expected)}`;

    expect(response.body, detail).toMatchObject(expected);
  });

  test("[API] PATCH /api/callbacks/:id returns 409 with message and latest callback when a stale version is submitted", async () => {
    const app = await createApp();
    const list = assertCallbacksArray(
      (await request(app).get("/api/callbacks").expect(200)).body,
    );
    const target = list[0];
    const claimed = await request(app)
      .post(`/api/callbacks/${target.id}/claim`)
      .send({ agent_id: "a1" })
      .expect(200);
    await request(app)
      .patch(`/api/callbacks/${target.id}`)
      .send({
        expected_version: claimed.body.version,
        status: "completed",
        notes: "First save wins.",
      })
      .expect(200);

    const stale = await request(app)
      .patch(`/api/callbacks/${target.id}`)
      .send({
        expected_version: claimed.body.version,
        status: "claimed",
        notes: "Outdated browser tab",
      })
      .expect(409);

    const detail =
      `stale.body=${JSON.stringify(stale.body)}; claimed.version=${JSON.stringify(claimed.body.version)}`;
    expect(stale.body.message, detail).toMatch(/stale/i);
    expect(stale.body.latest, detail).toMatchObject({
      status: "completed",
      notes: "First save wins.",
    });
  });
});
