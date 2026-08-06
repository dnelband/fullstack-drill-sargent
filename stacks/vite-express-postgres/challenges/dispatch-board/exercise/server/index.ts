import type { ChallengeServerModule } from "../../../../server/types.ts";
import { CallbackRecord, CallbackStatus } from "../../../../shared/types.ts";

const STATUS_OPTIONS = ["open", "claimed", "completed"] as CallbackStatus[];

const exerciseDispatchBoardServer: ChallengeServerModule = {
  async registerRoutes({ app, pool }) {
    // `pool` is a connected `pg` Pool. Use `pool.query(sql, params)` and return DB column names as-is.

    // Returns Agent[]
    app.get("/api/agents", async (_request, response) => {
      try {
        const result = await pool.query(
          `SELECT id, display_name, team FROM agents ORDER BY display_name ASC`,
        );
        response.status(200).json(result.rows);
      } catch (error) {
        response.status(500).json({
          message: "Error getting agents",
          error,
        });
      }
    });

    // Returns { open, claimed, completed }
    app.get("/api/summary", async (_request, response) => {
      try {
        const result = await pool.query(`
          SELECT
            COUNT(*) FILTER(WHERE status = 'open') as "open",
            COUNT(*) FILTER(WHERE status = 'claimed') as "claimed",
            COUNT(*) FILTER(WHERE status = 'completed') as "completed" 
          FROM callbacks
        `);
        response.status(200).json(result.rows[0]);
      } catch (error) {
        response.status(500).json({
          message: "Failed getting summary",
          error,
        });
      }
    });

    // Returns Callback[]
    app.get("/api/callbacks", async (request, response) => {
      try {
        const { status, assigned_agent_id, search } = request.query;
        const params = [status ?? "open"];

        let query = `SELECT callbacks.*, agents.display_name as "assigned_agent_name" 
          FROM callbacks
          LEFT JOIN agents
          ON agents.id = callbacks.assigned_agent_id
          WHERE status = $${params.length} `;

        if (assigned_agent_id && assigned_agent_id !== "all") {
          params.push(assigned_agent_id);
          query += `AND assigned_agent_id = $${params.length} `;
        }

        if (search) {
          params.push(`%${search}%`);
          query += `AND topic LIKE $${params.length} `;
        }

        query += `ORDER BY ( 
            case priority
            when 'high' then 1
            when 'medium' then 2
            when 'low' then 3
            end
          ), scheduled_for ASC`;
        const result = await pool.query(query, params);
        response.status(200).json(result.rows);
      } catch (error) {
        response.status(500).json({
          message: "Error getting callbacks",
          error,
        });
      }
    });

    let callbackClaimLock: Record<string, boolean> = {};

    // Returns Callback
    app.post("/api/callbacks/:id/claim", async (request, response) => {
      const { id } = request.params;
      const { agent_id } = request.body;

      if (!agent_id) {
        response.status(401).json({ message: "missing agent id" });
      }

      const agentResult = await pool.query(
        `SELECT id, display_name, team FROM agents WHERE id = $1`,
        [agent_id],
      );

      if (!agentResult.rows.length) {
        response.status(404).json({ message: "Callback not found" });
        return;
      }
      const agent = agentResult.rows[0];

      if (callbackClaimLock[id]) {
        response.status(409).json({
          message: "Callback is no longer open.",
        });
        return;
      }

      const callbackResult = await pool.query(
        `SELECT id, status, version FROM callbacks WHERE id = $1`,
        [id],
      );

      if (!callbackResult.rows.length) {
        response.status(404).json({ message: "Callback not found" });
        return;
      }

      const callback = callbackResult.rows[0];

      if (callback.status !== "open") {
        response.status(409).json({
          message: "Callback is no longer open.",
        });
        return;
      }

      try {
        const result = await pool.query(
          `UPDATE callbacks SET status = 'claimed', assigned_agent_id = $1, version = version + 1 WHERE id = $2 RETURNING id, status, assigned_agent_id, version`,
          [agent.id, callback.id],
        );
        response
          .status(200)
          .json({ ...result.rows[0], assigned_agent_name: agent.display_name });
      } catch (error) {
        response
          .status(500)
          .json({ message: "Error claiming callback", error });
      }

      delete callbackClaimLock[id];
    });

    // Returns Callback, or 409 { message, latest }
    app.patch("/api/callbacks/:id", async (request, response) => {
      const { body, params } = request;
      const { id } = params;
      const { notes, status, expected_version } = body;

      const errors = [];

      if (!notes || notes.length < 3) {
        errors.push({ error: "Notes must be minimum 3 characters" });
      }

      if (!STATUS_OPTIONS.includes(status)) {
        errors.push({ error: "Invalid status" });
      }

      if (errors.length > 0) {
        response.status(400).json(errors);
      }

      const callbackResult = await pool.query(
        `SELECT * FROM callbacks WHERE id = $1`,
        [id],
      );

      if (!callbackResult.rows.length) {
        response.status(404).json({ message: "Callback not found" });
      }

      const callback = callbackResult.rows[0];

      if (expected_version !== callback.version) {
        response.status(409).json({ message: "stale", latest: callback });
      }

      try {
        const updatedCallback = await pool.query(
          `UPDATE callbacks SET notes = $2, status = $3, version = version + 1 WHERE id = $1 RETURNING status, notes, version`,
          [callback.id, notes, status],
        );
        response.status(200).json(updatedCallback.rows[0]);
      } catch (error) {
        response
          .status(500)
          .json({ message: "Error updating callback", error });
      }
    });
  },
};

export default exerciseDispatchBoardServer;
export { exerciseDispatchBoardServer };
