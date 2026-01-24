// src/index.js
require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const { requireAuth } = require("./middleware/auth");
const reportsRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 3000;

/* ======================
   MIDDLEWARE
====================== */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

/* ======================
   ROUTES
====================== */

// Public
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// Protected example
app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", { user: req.user });
});

// Mentor-only reports
app.use("/reports", reportsRoutes);

/* ======================
   404 HANDLER
====================== */
app.use((req, res) => {
  res.status(404).send("Page not found");
});

/* ======================
   SERVER
====================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
