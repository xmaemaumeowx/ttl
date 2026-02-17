// src/middleware/loadUser.js
const db = require("../db/postgres");

async function loadUser(req, res, next) {
  try {
    // Normalize user id from JWT (supports both old + new token shapes)
    const userId = req.user?.user_id ?? req.user?.userId;

    if (!userId) {
      res.locals.user = null;
      return next();
    }

    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    res.locals.user = result.rows[0] || null;
    return next();
  } catch (err) {
    console.error("loadUser error:", err);
    res.locals.user = null;
    return next();
  }
}

module.exports = loadUser;