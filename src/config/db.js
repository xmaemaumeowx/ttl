const oracledb = require('oracledb');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function getConnection() {
  try {
    const conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      // This line ensures the wallet path is used
      configDir: process.env.TNS_ADMIN,
    });
    console.log("✅ Connected to Oracle ADB");
    return conn;
  } catch (err) {
    console.error("❌ Oracle DB connection error:", err);
    throw err;
  }
}

module.exports = { getConnection };
