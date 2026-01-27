const jwt = require("jsonwebtoken");

// ---- Require Authentication ----
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

// ---- Require Mentor Role ----
function requireMentor(req, res, next) {
  if (!req.user) return res.redirect("/login");
  if (req.user.role !== "mentor") {
    console.warn(`Unauthorized access attempt by user ${req.user.userId}`);
    return res.status(403).send("Access denied. Mentors only.");
  }
  next();
}

module.exports = { requireAuth, requireMentor };
