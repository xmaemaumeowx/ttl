// src/middleware/auth.js
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Backward compatible normalization:
    // old payload: { userId, role }
    // new payload: { user_id, role }
    req.user = {
      ...decoded,
      user_id: decoded.user_id ?? decoded.userId
    };

    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.redirect("/login");
  }
}

function requireMentor(req, res, next) {
  if (!req.user) return res.redirect("/login");
  if (req.user.role !== "mentor") {
    console.warn(`Unauthorized access attempt by user ${req.user.user_id}`);
    return res.status(403).send("Access denied. Mentors only.");
  }
  next();
}

module.exports = { requireAuth, requireMentor };