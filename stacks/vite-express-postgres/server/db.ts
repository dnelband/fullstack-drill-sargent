import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and update it.");
}

export const pool = new Pool({
  connectionString,
});

export async function closePool() {
  await pool.end();
}
