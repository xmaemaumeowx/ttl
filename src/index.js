// src/index.js
require("dotenv").config();

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");

const db = require("./db/postgres");
const cloudinaryStorage = require("./config/cloudinaryStorage");

// Routers
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const coursesRouter = require("./routes/courses");
const calendarRouter = require("./routes/calendar");
const reportsRouter = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 10000;

/* ===============================
   BASIC MIDDLEWARE
================================ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

/* ===============================
   STATIC FILES & VIEWS
   Put BEFORE routes so /images, /assets, css/js resolve correctly
================================ */
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===============================
   JWT DECODE (GLOBAL) + NORMALIZE
   Supports old tokens { userId } and new tokens { user_id }
================================ */
app.use((req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const normalizedUserId = decoded.user_id ?? decoded.userId;

    req.user = {
      ...decoded,
      userId: normalizedUserId,
      user_id: normalizedUserId,
    };

    return next();
  } catch (err) {
    console.error("JWT error:", err);
    req.user = null;
    return next();
  }
});

/* ===============================
   LOAD USER FROM DB (FOR AVATAR & ROLE)
   Makes DB user available to all EJS templates as locals.user
================================ */
app.use(loadUserFromDB);

async function loadUserFromDB(req, res, next) {
  const userId = req.user?.userId;

  if (!userId) {
    res.locals.user = null;
    return next();
  }

  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    const u = result.rows[0];
    res.locals.user = u
      ? {
          userId: u.user_id,
          fullName: u.full_name,
          email: u.email,
          role: u.role,
          avatar: u.avatar, // Cloudinary URL saved in DB
        }
      : null;

    return next();
  } catch (err) {
    console.error("Sidebar user load error:", err);
    res.locals.user = null;
    return next();
  }
}

/* ===============================
   GLOBAL LAYOUT VARIABLES
================================ */
app.use((req, res, next) => {
  res.locals.pageTitle = "The Tech Lab Dashboard";
  res.locals.activePage = "";
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
  if (!req.user) return res.redirect("/login");
  if (req.user.role !== "mentor") return res.redirect("/dashboard");
  next();
}

/* ===============================
   AUTH ROUTES
================================ */
app.use("/", authRoutes);

/* ===============================
   CORE PAGES
================================ */
app.get("/", (req, res) => res.render("index"));

app.get("/login", (req, res) => {
  res.render("login", {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  });
});

/* ===============================
   DASHBOARD
================================ */
app.get("/dashboard", requireAuth, async (req, res) => {
  res.locals.pageTitle = "Dashboard | The Tech Lab";
  res.locals.activePage = "dashboard";

  const result = await db.query(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`
  );

  res.render("dashboard", {
    announcements: result.rows || [],
  });
});

/* ===============================
   ROUTERS
================================ */
app.use("/projects", projectRoutes);
app.use("/", coursesRouter);
app.use("/calendar", calendarRouter);
app.use("/", reportsRouter);

/* ===============================
   LEARNERS (MENTOR)
================================ */
app.get("/learners", requireAuth, requireMentor, async (req, res) => {
  res.locals.pageTitle = "My Learners | The Tech Lab";
  res.locals.activePage = "learners";

  const result = await db.query(
    `SELECT user_id, full_name, email, avatar
     FROM users
     WHERE role = 'learner'
     ORDER BY full_name`
  );

  res.render("learners", { learners: result.rows });
});

/* ===============================
   SETTINGS
================================ */
app.get("/settings", requireAuth, (req, res) => {
  res.locals.pageTitle = "Settings | The Tech Lab";
  res.locals.activePage = "settings";

  res.render("settings", {
    successMessage: req.query.success || "",
    errorMessage: req.query.error || "",
  });
});

/* ===============================
   AVATAR UPLOAD (CLOUDINARY)
================================ */
const upload = multer({ storage: cloudinaryStorage });

app.post(
  "/profile/avatar",
  requireAuth,
  upload.single("avatar"),
  async (req, res) => {
    if (!req.file?.path) return res.redirect("/settings?error=Upload failed");

    await db.query(`UPDATE users SET avatar=$1 WHERE user_id=$2`, [
      req.file.path,
      req.user.userId,
    ]);

    res.redirect("/settings?success=Avatar updated!");
  }
);

/* ===============================
   PROFILE UPDATE
================================ */
app.post("/profile/update", requireAuth, async (req, res) => {
  const { fullName, email } = req.body;

  await db.query(`UPDATE users SET full_name=$1, email=$2 WHERE user_id=$3`, [
    fullName,
    email,
    req.user.userId,
  ]);

  res.redirect("/settings?success=Profile updated!");
});

/* ===============================
   PASSWORD CHANGE
================================ */
app.post("/profile/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await db.query(
    `SELECT password_hash FROM users WHERE user_id=$1`,
    [req.user.userId]
  );

  const hash = result.rows[0]?.password_hash;
  if (!hash) return res.redirect("/settings?error=User not found");

  const valid = await bcrypt.compare(currentPassword, hash);
  if (!valid) return res.redirect("/settings?error=Wrong password");

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query(`UPDATE users SET password_hash=$1 WHERE user_id=$2`, [
    hashed,
    req.user.userId,
  ]);

  res.redirect("/settings?success=Password updated!");
});

/* ===============================
   LOGOUT
================================ */
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});