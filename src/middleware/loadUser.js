// src/middleware/loadUser.js
const db = require("../db/postgres");

async function loadUser(req, res, next) {
  if (!req.user) {
    res.locals.user = null;
    return next();
  }
  const result = await db.query("SELECT * FROM users WHERE user_id = $1", [req.user.userId]);
  res.locals.user = result.rows[0] || null;
  next();
}

module.exports = loadUser;
