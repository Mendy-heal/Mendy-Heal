import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL

});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - start;
  if (ms > 300) console.warn("⚠️ Slow query:", { text, ms });
  return res;
}

// Get a client from the pool for transactions
export async function getClient() {
  return await pool.connect();
}
