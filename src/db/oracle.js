const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

/**
 * Initialize Oracle connection pool
 * Called ONCE on app startup
 */
async function initOracle() {
  if (pool) return pool;

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
    poolTimeout: 60,
  });

  console.log("✅ Oracle ADB pool initialized");
  return pool;
}

/**
 * Get a connection from the pool
 * Used inside routes
 */
async function getConnection() {
  if (!pool) {
    throw new Error("Oracle pool not initialized");
  }
  return pool.getConnection();
}

module.exports = {
  initOracle,
  getConnection,
};
