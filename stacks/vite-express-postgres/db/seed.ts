import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString });

const agents = [
  ["a1", "Nina Patel", "Ops"],
  ["a2", "Marco Silva", "Ops"],
  ["a3", "Iris Zhang", "Escalations"],
  ["a4", "Jonas Fischer", "Ops"],
  ["a5", "Amina Yusuf", "Escalations"],
  ["a6", "Lea Martin", "Ops"],
];

const callbacks = [
  ["Acme Logistics", "Invoice mismatch", "high", "open", null, "2026-08-04T08:00:00.000Z", "Customer is waiting for a corrected invoice before noon."],
  ["Blue Harbor Hotels", "Late driver check-in", "medium", "open", null, "2026-08-04T08:10:00.000Z", "Call before next guest transfer window."],
  ["Cloud Ridge Clinics", "Card declined on renewal", "high", "claimed", "a2", "2026-08-04T08:15:00.000Z", "Billing owner asked for a same-day callback."],
  ["Delta Home Goods", "Missing shipment", "high", "open", null, "2026-08-04T08:20:00.000Z", "Warehouse requested escalation if unresolved today."],
  ["Evergreen Pets", "Repeat cancellation request", "low", "open", null, "2026-08-04T08:25:00.000Z", "Customer has called twice this week."],
  ["Foxlane Travel", "Refund approval", "medium", "completed", "a1", "2026-08-04T08:30:00.000Z", "Resolved after manager callback."],
  ["Golden State Repairs", "Technician no-show", "high", "open", null, "2026-08-04T08:35:00.000Z", "Must be reassigned today."],
  ["Harborlight Schools", "Seat overbooking", "high", "claimed", "a3", "2026-08-04T08:40:00.000Z", "Family decision deadline is in two hours."],
  ["Indigo Works", "VAT receipt request", "low", "open", null, "2026-08-04T08:45:00.000Z", "Simple follow-up if documentation can be found."],
  ["Juniper Energy", "Service outage follow-up", "high", "open", null, "2026-08-04T08:50:00.000Z", "Needs callback before the field crew dispatch."],
  ["Kepler Foods", "Incorrect subscription tier", "medium", "open", null, "2026-08-04T08:55:00.000Z", "Requested clarification before lunch."],
  ["Lighthouse Tax", "Portal access locked", "medium", "claimed", "a4", "2026-08-04T09:00:00.000Z", "Security team already verified identity."],
  ["Mira Telecom", "Install appointment missed", "high", "open", null, "2026-08-04T09:05:00.000Z", "Potential churn risk."],
  ["Northwind Marine", "Duplicate charge", "high", "open", null, "2026-08-04T09:10:00.000Z", "Requires transaction reference in notes."],
  ["Oakwell Fitness", "Contract upgrade question", "low", "open", null, "2026-08-04T09:15:00.000Z", "Routine but time sensitive before renewal."],
  ["Pine River Legal", "Missing document packet", "medium", "open", null, "2026-08-04T09:20:00.000Z", "Attorney expects update today."],
  ["Quarry Analytics", "Trial extension request", "low", "completed", "a5", "2026-08-04T09:25:00.000Z", "Approved for seven additional days."],
  ["Red Maple Bank", "Failed identity verification", "high", "open", null, "2026-08-04T09:30:00.000Z", "Callback requires compliance note."],
  ["Solstice Health", "Prescription transfer", "medium", "open", null, "2026-08-04T09:35:00.000Z", "Patient expects afternoon confirmation."],
  ["Timberline HR", "Payroll export bug", "high", "claimed", "a6", "2026-08-04T09:40:00.000Z", "Needs workaround before payroll closes."],
  ["Union Square Media", "Canceled ad still running", "high", "open", null, "2026-08-04T09:45:00.000Z", "Client is requesting manager oversight."],
  ["Valley Transit", "Fare card refund", "low", "open", null, "2026-08-04T09:50:00.000Z", "Transit center closes at 17:00."],
  ["Westbridge Solar", "Permit upload issue", "medium", "open", null, "2026-08-04T09:55:00.000Z", "Installer waiting on corrected file."],
  ["Yellow Birch Labs", "Quote approval", "medium", "completed", "a2", "2026-08-04T10:00:00.000Z", "Customer approved new terms."],
];

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      team TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS callbacks (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_name TEXT NOT NULL,
      topic TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
      status TEXT NOT NULL CHECK (status IN ('open', 'claimed', 'completed')),
      assigned_agent_id TEXT REFERENCES agents(id),
      scheduled_for TIMESTAMPTZ NOT NULL,
      notes TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    TRUNCATE TABLE callbacks, agents RESTART IDENTITY CASCADE;
  `);

  for (const [id, displayName, team] of agents) {
    await pool.query(
      `INSERT INTO agents (id, display_name, team) VALUES ($1, $2, $3)`,
      [id, displayName, team],
    );
  }

  for (const [customerName, topic, priority, status, assignedAgentId, scheduledFor, notes] of callbacks) {
    await pool.query(
      `
        INSERT INTO callbacks (
          customer_name,
          topic,
          priority,
          status,
          assigned_agent_id,
          scheduled_for,
          notes,
          version,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW())
      `,
      [customerName, topic, priority, status, assignedAgentId, scheduledFor, notes],
    );
  }
}

main()
  .then(async () => {
    await pool.end();
    console.log("[db] seed complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] seed failed", error);
    await pool.end();
    process.exitCode = 1;
  });
