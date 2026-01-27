const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../db/postgres");

// ---- Require Authentication Helpers ----
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.redirect("/login");
  }
}

function requireMentor(req, res, next) {
  if (!req.user || req.user.role !== "mentor") {
    return res.status(403).send("Access denied. Mentors only.");
  }
  next();
}

// ---- Email/Password Login ----
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);
    const user = result.rows[0];
    if (!user) return res.redirect("/login?error=Invalid credentials");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.redirect("/login?error=Invalid credentials");

    const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET);
    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/login?error=Server error");
  }
});

// ---- Google Login ----
router.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  // Verify Google token
  const { OAuth2Client } = require("google-auth-library");
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const fullName = payload.name;

    // Check if user exists
    let result = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);
    let user = result.rows[0];

    // Create user if not exist
    if (!user) {
      result = await db.query(
        `INSERT INTO users (full_name, email) VALUES ($1, $2) RETURNING *`,
        [fullName, email]
      );
      user = result.rows[0];
    }

    const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET);
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireMentor = requireMentor;
