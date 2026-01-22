const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// -------------------- EMAIL/PASSWORD LOGIN --------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const connection = req.app.locals.db;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  try {
    const result = await connection.execute(
      "SELECT user_id, full_name, email, password FROM users WHERE email = :email",
      [email],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows.length) {
      return res.status(401).send("Invalid email or password.");
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.PASSWORD);
    if (!match) {
      return res.status(401).send("Invalid email or password.");
    }

    const token = jwt.sign({ userId: user.USER_ID }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect("/dashboard");

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// -------------------- GOOGLE SIGN-IN --------------------
router.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const fullName = payload.name;

    const db = req.app.locals.db;

    // 🔍 Check user
    const result = await db.execute(
      `SELECT user_id FROM users WHERE email = :email`,
      [email],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    let userId;

    if (result.rows.length === 0) {
      // 🆕 Create user
      const insert = await db.execute(
        `INSERT INTO users (full_name, email, role)
         VALUES (:fullName, :email, 'learner')
         RETURNING user_id INTO :id`,
        {
          fullName,
          email,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      userId = insert.outBinds.id[0];
    } else {
      userId = result.rows[0].USER_ID;
    }
    // 2. Generate JWT
    const token = jwt.sign({ userId },process.env.JWT_SECRET,{ expiresIn: "7d" });

    // 3. Set cookie & respond JSON
res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    // ✅ JSON ONLY
    return res.json({ success: true });

  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

module.exports = router;

