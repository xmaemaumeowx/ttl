const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
const { OAuth2Client } = require("google-auth-library");

// Google client
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
  const { credential } = req.body;
  const connection = req.app.locals.db;

  if (!credential) return res.status(400).send("Google credential missing.");

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const fullName = payload.name;

    // Check if user exists
    let result = await connection.execute(
      "SELECT user_id, full_name, email FROM users WHERE email = :email",
      [email],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    let user;
    if (result.rows.length) {
      user = result.rows[0];
    } else {
      // Create new user
      const insert = await connection.execute(
        "INSERT INTO users (full_name, email, role, password) VALUES (:full_name, :email, 'learner', :password) RETURNING user_id INTO :id",
        { full_name: fullName, email, password: "" , id: { dir: oracledb.BIND_OUT } },
        { autoCommit: true }
      );
      user = { USER_ID: insert.outBinds.id[0], full_name: fullName, email };
    }

    const token = jwt.sign({ userId: user.USER_ID }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ success: true, redirect: "/dashboard" });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
