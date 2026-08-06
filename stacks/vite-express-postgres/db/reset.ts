import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString });

async function main() {
  await pool.query(`
    DROP TABLE IF EXISTS callbacks;
    DROP TABLE IF EXISTS agents;
  `);
}

main()
  .then(async () => {
    await pool.end();
    console.log("[db] reset complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] reset failed", error);
    await pool.end();
    process.exitCode = 1;
  });
