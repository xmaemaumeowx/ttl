require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");

const db = require("./db/postgres"); // keep this as it was

const app = express();
const PORT = process.env.PORT || 10000;

// ...all your middleware, views, routes as it was originally


// Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "../../public")));

// Routes
app.use("/", authRoutes);

// Example protected dashboard
app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", { user: req.user });
});

app.get("/login", (req, res) => {
  res.render("login", { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID });
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
