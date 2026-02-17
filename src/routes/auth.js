// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../db/postgres');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).send('Missing credential');

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const fullName = payload.name;

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

    // Standardize JWT payload keys
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Recommended cookie flags (adjust secure for local dev if needed)
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).send('Google login failed');
  }
});

module.exports = router;