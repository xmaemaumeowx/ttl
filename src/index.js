// src/index.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const db = require("./db/postgres");

// Import routes
const authRoutes = require("./routes/auth");
const calendarRoutes = require("./routes/calendar");

const app = express();
const PORT = process.env.PORT || 10000;

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

/* ===============================
   STATIC & VIEWS
================================ */
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===============================
   GLOBAL USER LOADER
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
   GLOBAL LAYOUT VARIABLES
================================ */
app.use((req, res, next) => {
  res.locals.pageTitle = "The Tech Lab Dashboard";
  res.locals.activePage = "";
  res.locals.user = null;
  next();
});

/* ===============================
   AUTH MIDDLEWARE
================================ */
const { requireAuth, requireMentor } = require("./routes/auth");

/* ===============================
   ROUTES
================================ */
app.use("/", authRoutes); // login/signup, Google auth

// Dashboard
app.get("/dashboard", requireAuth, loadUserFromDB, async (req, res) => {
  res.locals.pageTitle = "Dashboard | The Tech Lab";
  res.locals.activePage = "dashboard";

  const result = await db.query(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`
  );

  res.render("dashboard", { announcements: result.rows || [] });
});

// Projects
app.get("/projects", requireAuth, loadUserFromDB, async (req, res) => {
  res.locals.pageTitle = "Projects | The Tech Lab";
  res.locals.activePage = "projects";

  const result = await db.query(
    `SELECT * FROM projects ORDER BY created_at DESC`
  );

  res.render("projects", { projects: result.rows || [] });
});

// Courses
app.get("/courses", requireAuth, loadUserFromDB, async (req, res) => {
  res.locals.pageTitle = "Courses | The Tech Lab";
  res.locals.activePage = "courses";

  const result = await db.query(
    `SELECT * FROM courses ORDER BY created_at DESC`
  );

  res.render("courses", { courses: result.rows || [] });
});

// Settings
app.get("/settings", requireAuth, loadUserFromDB, (req, res) => {
  res.locals.pageTitle = "Settings | The Tech Lab";
  res.locals.activePage = "settings";
  res.render("settings", {
    successMessage: req.query.success || "",
    errorMessage: req.query.error || "",
  });
});

// Learners (mentor)
app.get("/learners", requireAuth, requireMentor, loadUserFromDB, async (req, res) => {
  res.locals.pageTitle = "My Learners | The Tech Lab";
  res.locals.activePage = "learners";

  const result = await db.query(
    `SELECT u.user_id, u.full_name, u.email
     FROM mentor_learner ml
     JOIN users u ON ml.user_id = u.user_id
     WHERE ml.mentor_id = $1`,
    [req.user.userId]
  );

  res.render("learners", { learners: result.rows });
});

// Mount calendar routes properly
app.use("/calendar", requireAuth, loadUserFromDB, calendarRoutes);

// Avatar upload & profile updates
const cloudinaryStorage = require("./config/cloudinaryStorage");
const upload = multer({ storage: cloudinaryStorage });

app.post("/profile/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file?.path) return res.redirect("/settings?error=Upload failed");
  await db.query(`UPDATE users SET avatar=$1 WHERE user_id=$2`, [req.file.path, req.user.userId]);
  res.redirect("/settings?success=Avatar updated!");
});

app.post("/profile/update", requireAuth, async (req, res) => {
  const { fullName, email } = req.body;
  await db.query(
    `UPDATE users SET full_name=$1, email=$2 WHERE user_id=$3`,
    [fullName, email, req.user.userId]
  );
  res.redirect("/settings?success=Profile updated!");
});

app.post("/profile/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await db.query(`SELECT password_hash FROM users WHERE user_id=$1`, [req.user.userId]);
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) return res.redirect("/settings?error=Wrong password");
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query(`UPDATE users SET password_hash=$1 WHERE user_id=$2`, [hashed, req.user.userId]);
  res.redirect("/settings?success=Password updated!");
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
