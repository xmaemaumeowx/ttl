// src/index.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const bcrypt = require("bcrypt");
const db = require("./db/postgres");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- MIDDLEWARE ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// ---- VIEW ENGINE ----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---- AUTH MIDDLEWARE ----
const { requireAuth, requireMentor } = require("./middleware/auth");

// ---- LOAD USER FOR SIDEBAR/AVATAR ----
async function loadUserFromDB(req, res, next) {
  if (!req.user?.userId) {
    res.locals.user = {};
    return next();
  }
  try {
    const result = await db.query(
      "SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = $1",
      [req.user.userId]
    );
    const dbUser = result.rows[0] || {};
    res.locals.user = {
      avatar: dbUser.avatar || null,
      fullName: dbUser.full_name || "",
      email: dbUser.email || "",
      role: dbUser.role || "",
      userId: dbUser.user_id || "",
    };
    next();
  } catch (err) {
    console.error("Error loading user:", err);
    res.locals.user = {};
    next();
  }
}

// ---- ROUTES ----

// Auth routes
const authRoutes = require("./routes/auth");
app.use("/", authRoutes);

// Dashboard
app.get("/dashboard", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5"
    );
    const announcements = result.rows;
    res.render("dashboard", {
      pageTitle: "Dashboard | The Tech Lab",
      activePage: "dashboard",
      user: res.locals.user,
      announcements,
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.render("dashboard", {
      pageTitle: "Dashboard | The Tech Lab",
      activePage: "dashboard",
      user: res.locals.user,
      announcements: [],
    });
  }
});

// Settings
app.get("/settings", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = $1",
      [req.user.userId]
    );
    const dbUser = result.rows[0];
    if (dbUser) {
      res.locals.user = {
        avatar: dbUser.avatar || null,
        fullName: dbUser.full_name || "",
        email: dbUser.email || "",
        role: dbUser.role || "",
        userId: dbUser.user_id || "",
      };
    }
    res.render("settings", {
      pageTitle: "Settings | The Tech Lab",
      activePage: "settings",
      successMessage: req.query.success || "",
      errorMessage: req.query.error || "",
    });
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).send("Unable to load settings page.");
  }
});

// ---- AVATAR UPLOAD ----
const cloudinaryStorage = require("./config/cloudinaryStorage");
const upload = multer({ storage: cloudinaryStorage });

app.post(
  "/profile/avatar",
  requireAuth,
  upload.single("avatar"),
  async (req, res) => {
    if (!req.file || !req.file.path) {
      return res.redirect("/settings?error=Upload%20failed");
    }
    try {
      await db.query(
        "UPDATE users SET avatar = $1 WHERE user_id = $2",
        [req.file.path, req.user.userId]
      );
      res.redirect("/settings?success=Avatar%20updated%20successfully!");
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      res.redirect("/settings?error=Failed%20to%20update%20avatar");
    }
  }
);

// Profile update
app.post("/profile/update", requireAuth, async (req, res) => {
  const { fullName, email } = req.body;
  try {
    await db.query(
      "UPDATE users SET full_name=$1, email=$2 WHERE user_id=$3",
      [fullName, email, req.user.userId]
    );
    res.redirect("/settings?success=Profile%20updated%20successfully!");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.redirect("/settings?error=Unable%20to%20update%20profile");
  }
});

// Password reset
app.post("/profile/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await db.query(
      "SELECT password_hash FROM users WHERE user_id=$1",
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) return res.redirect("/settings?error=User%20not%20found");
    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches)
      return res.redirect("/settings?error=Current%20password%20is%20incorrect");
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash=$1 WHERE user_id=$2", [
      hashed,
      req.user.userId,
    ]);
    res.redirect("/settings?success=Password%20changed%20successfully!");
  } catch (err) {
    console.error("Error resetting password:", err);
    res.redirect("/settings?error=Unable%20to%20reset%20password");
  }
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// ---- ROUTES MOUNT ----
const projectsRoutes = require("./routes/projects");
app.use("/projects", requireAuth, loadUserFromDB, projectsRoutes);

const reportsRoutes = require("./routes/reports");
app.use("/reports", requireAuth, loadUserFromDB, reportsRoutes);

const courseRoutes = require("./routes/course");
app.use("/courses", requireAuth, loadUserFromDB, courseRoutes);

const calendarRoutes = require("./routes/calendar");
app.use("/calendar", requireAuth, loadUserFromDB, calendarRoutes);

// ---- HOME & LOGIN ----
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
  if (!googleClientId) console.warn("⚠️ GOOGLE_CLIENT_ID is not set!");
  res.render("login", { GOOGLE_CLIENT_ID: googleClientId });
});

// ---- START SERVER ----
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
