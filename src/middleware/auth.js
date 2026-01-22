// src/middleware/auth.js
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    console.error("JWT error:", err);
    res.redirect("/login");
  }
}

module.exports = requireAuth;
