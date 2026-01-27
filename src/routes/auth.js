// src/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/postgres");

/* ------------------------------
   LOGIN / SIGNUP
------------------------------ */

// Email/Password login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);
  const user = result.rows[0];
  if (!user) return res.redirect("/login?error=Invalid credentials");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.redirect("/login?error=Invalid credentials");

  const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, maxAge: 604800000 }); // 7 days
  res.redirect("/dashboard");
});

// Google Login / SignUp
router.post("/auth/google", async (req, res) => {
  const credential = req.body?.credential;
  if (!credential) return res.status(400).json({ error: "Missing Google credential" });

  // Verify token with Google API
  const { OAuth2Client } = require("google-auth-library");
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google token verification failed", err);
    return res.status(401).json({ error: "Invalid Google token" });
  }

  // Check if user exists
  let userResult = await db.query(`SELECT * FROM users WHERE email=$1`, [payload.email]);
  let user = userResult.rows[0];

  if (!user) {
    // Create new user
    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    const insert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, avatar) VALUES ($1,$2,$3,'learner',$4) RETURNING *`,
      [payload.name, payload.email, passwordHash, payload.picture]
    );
    user = insert.rows[0];
  }

  // Generate JWT
  const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, maxAge: 604800000 }); // 7 days
  res.json({ success: true });
});

/* ------------------------------
   MIDDLEWARE EXPORTS
------------------------------ */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.redirect("/login");
  }
}

function requireMentor(req, res, next) {
  if (!req.user || req.user.role !== "mentor") return res.status(403).send("Access denied. Mentors only.");
  next();
}

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireMentor = requireMentor;
