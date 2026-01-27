require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
+ const app = express();
const authRoutes = require('./routes/auth');
+ const db = require("./db/postgres");
const PORT = process.env.PORT || 10000;

+ app.use('/auth', authRoutes); // <-- must be after "app" is defined

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===============================
   JWT DECODE (GLOBAL)
================================ */
app.use((req, res, next) => {
  const token = req.cookies?.token;
  req.user = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
  next();
});

/* ===============================
   LAYOUT VARIABLES
================================ */
app.use((req, res, next) => {
  res.locals.pageTitle = "The Tech Lab Dashboard";
  res.locals.activePage = "";
  res.locals.user = null;
  next();
});

/* ===============================
   AUTH HELPERS
================================ */
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

function requireMentor(req, res, next) {
  if (req.user?.role !== "mentor") return res.redirect("/dashboard");
  next();
}

/* ===============================
   LOAD USER FOR SIDEBAR
================================ */
async function loadUserFromDB(req, res, next) {
  if (!req.user?.userId) return next();
  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar
       FROM users WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows[0]) {
      const u = result.rows[0];
      res.locals.user = {
        userId: u.user_id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
      };
    }
    next();
  } catch (err) {
    console.error("Sidebar user load error:", err);
    next();
  }
}

/* ===============================
   CORE PAGES
================================ */
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => {
  res.render("login", { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID });
});
app.get("/dashboard", requireAuth, loadUserFromDB, async (req, res) => {
  res.locals.pageTitle = "Dashboard | The Tech Lab";
  res.locals.activePage = "dashboard";
  const result = await db.query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`);
  res.render("dashboard", { announcements: result.rows || [] });
});
app.get("/calendar", requireAuth, loadUserFromDB, (req, res) => {
  res.locals.pageTitle = "Calendar | The Tech Lab";
  res.locals.activePage = "calendar";
  res.render("calendar"); // ✅ keeps existing layout/theme intact
});

/* ===============================
   CALENDAR ROUTES
================================ */
const calendarRoutes = require('./routes/calendar');
app.use('/calendar', calendarRoutes);

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
