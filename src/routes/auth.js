const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db/postgres");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth callback
router.post("/auth/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) return res.status(400).json({ error: "Missing credential" });

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Extract user info
    const { email, name, sub: googleId, picture } = payload;

    // Check if user exists
    const userRes = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    let user;
    if (userRes.rows.length === 0) {
      // Create new user (default role: learner)
      const insertRes = await db.query(
        `INSERT INTO users (full_name, email, role, created_at) VALUES ($1,$2,'learner',NOW()) RETURNING *`,
        [name, email]
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set cookie (httpOnly for security)
    res.cookie("token", token, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

module.exports = router;
