// src/index.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Static & Views
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Oracle DB
let connection;
async function initDB() {
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    console.log("✅ Connected to Oracle DB");
  } catch (err) {
    console.error("Oracle DB connection error:", err);
  }
}
initDB();

// Routes
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));

// ---------------- Signup ----------------
app.post("/signup", async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields are required!" });

  try {
    const result = await connection.execute(`SELECT * FROM users WHERE email = :email`, [email]);
    if (result.rows.length > 0)
      return res.status(400).json({ success: false, message: "Email already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.execute(
      `INSERT INTO users (full_name, email, password_hash) VALUES (:name, :email, :password)`,
      { name: full_name, email, password: hashedPassword },
      { autoCommit: true }
    );

    const token = jwt.sign({ email, full_name }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true });

    return res.json({ success: true, message: "Signup successful!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- Login ----------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required!" });

  try {
    const result = await connection.execute(`SELECT * FROM users WHERE email = :email`, [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ success: false, message: "User not found!" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!match) return res.status(400).json({ success: false, message: "Incorrect password!" });

    const token = jwt.sign({ email, full_name: user.FULL_NAME }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true });

    return res.json({ success: true, message: "Login successful!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Dashboard (JWT protected)
app.get("/dashboard", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.send(`<h2>Welcome ${decoded.full_name}!</h2><a href="/logout">Logout</a>`);
  } catch (err) {
    return res.redirect("/login");
  }
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
