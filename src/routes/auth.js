// src/routes/auth.js
const express = require("express");
const router = express.Router();
const db = require("../db/postgres");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Regular login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.redirect("/login?error=User not found");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.redirect("/login?error=Wrong password");

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/login?error=Login failed");
  }
});

// Google login
router.post("/auth/google", async (req, res) => {
  const credential = req.body?.credential;
  if (!credential) return res.status(400).json({ error: "No credential provided" });

  try {
    // Here you would verify the Google token using google-auth-library
    // For simplicity, we'll just simulate a verified user
    const email = "googleuser@example.com"; // replace with verified email
    let result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    let user = result.rows[0];

    if (!user) {
      // auto-create user
      result = await db.query(
        "INSERT INTO users (full_name, email) VALUES ($1, $2) RETURNING *",
        ["Google User", email]
      );
      user = result.rows[0];
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Google login failed" });
  }
});

module.exports = router;
