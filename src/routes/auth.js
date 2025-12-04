const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { findUserByEmail, createUser, verifyUserPassword } = require('../models/userModel');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Render login page
router.get("/login", (req, res) => {
  res.render("login");
});

// Render signup page
router.get("/signup", (req, res) => {
  res.render("signup");
});

// --------- MANUAL SIGNUP ----------
router.post("/signup", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    let existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    // Use "learner" as default role
    await createUser(full_name, email, password, "learner");
    const newUser = await findUserByEmail(email);
    const token = jwt.sign(
      {
        userId: newUser.USER_ID,
        email: newUser.EMAIL,
        fullName: newUser.FULL_NAME,
        role: newUser.ROLE
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Signup successful", redirect: "/dashboard" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// --------- MANUAL LOGIN ----------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !(await verifyUserPassword(user, password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      {
        userId: user.USER_ID,
        email: user.EMAIL,
        fullName: user.FULL_NAME,
        role: user.ROLE
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Login successful", redirect: "/dashboard" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// --------- GOOGLE LOGIN/SIGNUP ----------
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const fullName = payload.name;

    // Check if user already exists
    let user = await findUserByEmail(email);
    if (!user) {
      await createUser(fullName, email, null, "learner"); // role 'learner' by default
      user = await findUserByEmail(email);
    }
    const token = jwt.sign(
      {
        userId: user.USER_ID,
        email: user.EMAIL,
        fullName: user.FULL_NAME,
        role: user.ROLE
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Google login successful!", redirect: "/dashboard" });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

module.exports = router;