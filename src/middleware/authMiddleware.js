const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect("/login");
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // includes userId, and (if you add it in login) fullName, avatar, etc.
    next();
  } catch (err) {
    console.error("Invalid token:", err);
    res.redirect("/login");
  }
}

module.exports = verifyToken;