const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { findUserByEmail, createUser } = require("../models/userModel");

// 🔐 JWT Secret (store securely in .env)
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

// ✅ Render login page (with signup modal)
router.get("/login", (req, res) => {
  res.render("login");
});

// ✅ POST /signup — create new user
router.post("/signup", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(full_name, email, hashedPassword, "learner");

    console.log("✅ New user created:", email);

    // Respond with JSON so the modal’s fetch() can handle the toast + redirect
    return res.status(201).json({
      success: true,
      message: "Signup successful! Please log in.",
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during signup.",
      error: err.message,
    });
  }
});

// ✅ POST /login — authenticate and issue JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found." });
    }

    const storedHash = user.PASSWORD_HASH || user.password_hash;
    const isMatch = await bcrypt.compare(password, storedHash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    // 🪙 Generate JWT
    const token = jwt.sign(
      {
        id: user.USER_ID,
        email: user.EMAIL,
        role: user.ROLE,
        fullName: user.FULL_NAME,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Set cookie (client uses JWT for protected pages)
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
    });

    console.log("✅ Login successful:", email);
    return res.status(200).json({
      success: true,
      message: "Login successful!",
      redirect: "/dashboard",
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during login.",
      error: err.message,
    });
  }
});

// ✅ GET /logout — clear session cookie
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

module.exports = router;
