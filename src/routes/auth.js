const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../db/postgres");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ===============================
   EMAIL/PASSWORD LOGIN
================================ */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.redirect("/login?error=Email and password required");

  try {
    const result = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);
    if (result.rows.length === 0)
      return res.redirect("/login?error=Invalid credentials");

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.redirect("/login?error=Invalid credentials");

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.redirect("/login?error=Server error");
  }
});

/* ===============================
   GOOGLE LOGIN
================================ */
router.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

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
    let user;
    if (result.rows.length === 0) {
      const insert = await db.query(
        `INSERT INTO users (full_name, email) VALUES ($1, $2) RETURNING *`,
        [fullName, email]
      );
      user = insert.rows[0];
    } else {
      user = result.rows[0];
    }

    // JWT
    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
});

/* ===============================
   EMAIL/PASSWORD SIGNUP
================================ */
router.post("/signup", async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.redirect("/login?error=All fields required");

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING *`,
      [full_name, email, hashed]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Signup error:", err);
    res.redirect("/login?error=Server error");
  }
});

module.exports = router;
