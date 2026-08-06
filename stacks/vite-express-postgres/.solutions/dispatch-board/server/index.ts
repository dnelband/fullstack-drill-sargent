import type { ChallengeServerModule } from "../../../server/types.ts";
import type { CallbackRecord, CallbackSummary } from "../../../shared/types.ts";

function mapCallbackRow(row: Record<string, unknown>): CallbackRecord {
  return {
    id: Number(row.id),
    customer_name: String(row.customer_name),
    topic: String(row.topic),
    priority: row.priority as CallbackRecord["priority"],
    status: row.status as CallbackRecord["status"],
    assigned_agent_id: row.assigned_agent_id ? String(row.assigned_agent_id) : null,
    assigned_agent_name: row.assigned_agent_name ? String(row.assigned_agent_name) : null,
    scheduled_for: new Date(String(row.scheduled_for)).toISOString(),
    notes: String(row.notes),
    version: Number(row.version),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapSummaryRow(row: Record<string, unknown>): CallbackSummary {
  return {
    open: Number(row.open_count),
    claimed: Number(row.claimed_count),
    completed: Number(row.completed_count),
  };
}

async function selectSummary(pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }) {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'claimed') AS claimed_count,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
    FROM callbacks
  `);

  return mapSummaryRow(result.rows[0] ?? {});
}

const referenceDispatchBoardServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    app.get("/api/agents", async (_request, response) => {
      const result = await pool.query(
        `SELECT id, display_name, team FROM agents ORDER BY display_name ASC`,
      );

      response.json(
        result.rows.map((row) => ({
          id: String(row.id),
          display_name: String(row.display_name),
          team: String(row.team),
        })),
      );
    });

    app.get("/api/summary", async (_request, response) => {
      response.json(await selectSummary(pool));
    });

    app.get("/api/callbacks", async (request, response) => {
      const clauses: string[] = [];
      const values: string[] = [];

      const status = typeof request.query.status === "string" ? request.query.status : "open";
      const assignedAgentId =
        typeof request.query.assigned_agent_id === "string" ? request.query.assigned_agent_id : undefined;
      const search = typeof request.query.search === "string" ? request.query.search.trim() : undefined;

      if (status) {
        values.push(status);
        clauses.push(`c.status = $${values.length}`);
      }

      if (assignedAgentId) {
        values.push(assignedAgentId);
        clauses.push(`c.assigned_agent_id = $${values.length}`);
      }

      if (search) {
        values.push(`%${search.toLowerCase()}%`);
        clauses.push(`(LOWER(c.customer_name) LIKE $${values.length} OR LOWER(c.topic) LIKE $${values.length})`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await pool.query(
        `
          SELECT
            c.id,
            c.customer_name,
            c.topic,
            c.priority,
            c.status,
            c.assigned_agent_id,
            a.display_name AS assigned_agent_name,
            c.scheduled_for,
            c.notes,
            c.version,
            c.updated_at
          FROM callbacks c
          LEFT JOIN agents a ON a.id = c.assigned_agent_id
          ${where}
          ORDER BY
            CASE c.priority
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              ELSE 3
            END ASC,
            c.scheduled_for ASC
        `,
        values,
      );

      response.json(result.rows.map(mapCallbackRow));
    });

    app.post("/api/callbacks/:id/claim", async (request, response) => {
      const callbackId = Number(request.params.id);
      const agentId = String(request.body.agent_id ?? "");

      const result = await pool.query(
        `
          UPDATE callbacks
          SET
            status = 'claimed',
            assigned_agent_id = $2,
            version = version + 1,
            updated_at = NOW()
          WHERE id = $1 AND status = 'open'
          RETURNING
            id,
            customer_name,
            topic,
            priority,
            status,
            assigned_agent_id,
            scheduled_for,
            notes,
            version,
            updated_at
        `,
        [callbackId, agentId],
      );

      if (result.rows.length === 0) {
        response.status(409).json({
          message: "Callback is no longer open.",
        });
        return;
      }

      const callback = result.rows[0];
      const agent = await pool.query(`SELECT display_name FROM agents WHERE id = $1`, [callback.assigned_agent_id]);
      response.json(
        mapCallbackRow({
          ...callback,
          assigned_agent_name: agent.rows[0]?.display_name ?? null,
        }),
      );
    });

    app.patch("/api/callbacks/:id", async (request, response) => {
      const callbackId = Number(request.params.id);
      const expectedVersion = Number(request.body.expected_version);
      const status = String(request.body.status);
      const notes = String(request.body.notes ?? "");

      const result = await pool.query(
        `
          UPDATE callbacks
          SET
            status = $3,
            notes = $4,
            version = version + 1,
            updated_at = NOW()
          WHERE id = $1 AND version = $2
          RETURNING
            id,
            customer_name,
            topic,
            priority,
            status,
            assigned_agent_id,
            scheduled_for,
            notes,
            version,
            updated_at
        `,
        [callbackId, expectedVersion, status, notes],
      );

      if (result.rows.length === 0) {
        const latest = await pool.query(
          `
            SELECT
              c.id,
              c.customer_name,
              c.topic,
              c.priority,
              c.status,
              c.assigned_agent_id,
              a.display_name AS assigned_agent_name,
              c.scheduled_for,
              c.notes,
              c.version,
              c.updated_at
            FROM callbacks c
            LEFT JOIN agents a ON a.id = c.assigned_agent_id
            WHERE c.id = $1
          `,
          [callbackId],
        );

        response.status(409).json({
          message: "Your copy is stale. Refresh with the latest callback data.",
          latest: latest.rows[0] ? mapCallbackRow(latest.rows[0]) : null,
        });
        return;
      }

      const callback = result.rows[0];
      const agent = await pool.query(`SELECT display_name FROM agents WHERE id = $1`, [callback.assigned_agent_id]);
      response.json(
        mapCallbackRow({
          ...callback,
          assigned_agent_name: agent.rows[0]?.display_name ?? null,
        }),
      );
    });
  },
};

export default referenceDispatchBoardServer;
export { referenceDispatchBoardServer };
