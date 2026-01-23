const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db/postgres");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /auth/google
 */
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    // 🔐 Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const { email, name, picture } = payload;

    // 🔎 Check if user exists
    const existingUser = await db.query(
      `SELECT user_id, full_name, email, role FROM users WHERE email = $1`,
      [email]
    );

    let user;

    if (existingUser.rows.length === 0) {
      // ➕ Create user (OAuth user → no password_hash)
      const insert = await db.query(
        `
        INSERT INTO users (full_name, email, role, avatar, created_at)
        VALUES ($1, $2, 'learner', $3, NOW())
        RETURNING user_id, full_name, email, role
        `,
        [name, email, picture]
      );
      user = insert.rows[0];
    } else {
      user = existingUser.rows[0];
    }

    // 🔑 Create JWT
    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );      
    res.json({ token, user });
  } catch (err) {
    console.error("Error in /auth/google:", err);
    res.status(500).json({ error: "Internal server error" });
  }     
});

module.exports = router;  
  
