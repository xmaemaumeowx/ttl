require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const { requireAuth, requireMentor } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
