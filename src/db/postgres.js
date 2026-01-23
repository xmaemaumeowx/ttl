/**
 * PostgreSQL DB Layer
 * -------------------
 * Environment:
 *   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
 */

const { Pool } = require("pg");

// Fail fast if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false, // required for Neon / Render
  },
  max: 10,                    // connection pool size
  idleTimeoutMillis: 30000,   // close idle clients after 30s
  connectionTimeoutMillis: 10000, // fail fast if DB is unreachable
});

// Optional: log successful connection once
pool.on("connect", () => {
  console.log("✅ PostgreSQL pool connected");
});

// Log unexpected errors (don’t crash silently)
pool.on("error", (err) => {
  console.error("🔥 Unexpected PostgreSQL error", err);
  process.exit(1);
});

/**
 * Run a parameterized query safely
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== "production") {
      console.log("📊 query", {
        text,
        duration: `${duration}ms`,
        rows: res.rowCount,
      });
    }

    return res;
  } catch (err) {
    console.error("❌ DB query failed", {
      text,
      params,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Graceful shutdown (Render / SIGTERM)
 */
async function close() {
  console.log("🛑 Closing PostgreSQL pool...");
  await pool.end();
}

process.on("SIGTERM", close);
process.on("SIGINT", close);

module.exports = {
  pool,
  query,
};
