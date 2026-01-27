// src/middleware/auth.js
const jwt = require("jsonwebtoken");

/* ===============================
   Require Authentication Middleware
   - Parses JWT from cookies
   - Attaches req.user
   - Redirects to /login if invalid
================================ */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded JWT to request
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.clearCookie("token"); // Clear invalid token
    return res.redirect("/login");
  }
}

/* ===============================
   Require Mentor Role Middleware
   - Must be authenticated first
   - Only allows mentors
================================ */
function requireMentor(req, res, next) {
  if (!req.user) return res.redirect("/login");

  if (req.user.role !== "mentor") {
    console.warn(`Unauthorized access attempt by user ${req.user.userId}`);
    return res.status(403).send("Access denied. Mentors only.");
  }
  next();
}

/* ===============================
   Optional Middleware to Load User for Layouts
   - Use in routes to populate sidebar / avatar
================================ */
async function loadUserFromDB(req, res, next) {
  const db = require("../db/postgres"); // Lazy load to avoid circular dependency
  if (!req.user?.userId) return next();

  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar
       FROM users WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows[0]) {
      const u = result.rows[0];
      res.locals.user = {
        userId: u.user_id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
      };
    }
    next();
  } catch (err) {
    console.error("Error loading user for layout:", err);
    next();
  }
}

module.exports = { requireAuth, requireMentor, loadUserFromDB };
