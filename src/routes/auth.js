const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { findUserByEmail, createUser, verifyUserPassword } = require('../models/userModel');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Render Login Page
router.get('/login', (req, res) => {
  res.render('login', { googleClientId: process.env.GOOGLE_CLIENT_ID });
});

// Render Signup Page
router.get('/signup', (req, res) => res.render('signup'));

// Manual Signup
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    await createUser(full_name, email, password, "learner");
    const newUser = await findUserByEmail(email);

    const token = jwt.sign({
      userId: newUser.USER_ID,
      email: newUser.EMAIL,
      fullName: newUser.FULL_NAME,
      role: newUser.ROLE
    }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Signup successful", redirect: "/dashboard" });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Manual Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

    if (!user || !(await verifyUserPassword(user, password)))
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({
      userId: user.USER_ID,
      email: user.EMAIL,
      fullName: user.FULL_NAME,
      role: user.ROLE
    }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Login successful", redirect: "/dashboard" });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Google Login / Signup
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name: fullName } = payload;

    let user = await findUserByEmail(email);
    if (!user) {
      await createUser(fullName, email, null, "learner");
      user = await findUserByEmail(email);
    }

    const token = jwt.sign({
      userId: user.USER_ID,
      email: user.EMAIL,
      fullName: user.FULL_NAME,
      role: user.ROLE
    }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Google login successful!", redirect: "/dashboard" });

  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

module.exports = router;
