require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const db = require("./db/postgres");
const projectRoutes = require("./routes/projects");
const authRoutes = require("./routes/auth");
const calendarRoutes = require("./routes/calendar");
const reportsRouter = require("./routes/reports");
const cloudinaryStorage = require("./config/cloudinaryStorage");

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
================================ */
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===============================
   JWT DECODE (GLOBAL)
================================ */
app.use((req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
});

/* ===============================
   LOAD USER FROM DB (FOR AVATAR & ROLE)
================================ */
app.use(loadUserFromDB);
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
   AUTH ROUTES
================================ */
app.use("/", authRoutes);

/* ===============================
   PROJECTS ROUTES
================================ */
app.use("/projects", loadUserFromDB, projectRoutes);

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
app.get("/dashboard", requireAuth, loadUserFromDB, async (req, res) => {
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
   COURSES
================================ */
const coursesRouter = require("./routes/courses");
app.use("/", loadUserFromDB, coursesRouter);

/* ===============================
   CALENDAR ROUTES
================================ */
const calendarRouter = require("./routes/calendar");
app.use("/calendar", loadUserFromDB, calendarRouter);


/* ===============================
   REPORTS
================================ */
app.use('/', reportsRouter);


/* ===============================
   LEARNERS (MENTOR)
================================ */
app.get("/learners", requireAuth, requireMentor, loadUserFromDB, async (req, res) => {
  res.locals.pageTitle = "My Learners | The Tech Lab";
  res.locals.activePage = "learners";

  const result = await db.query(
    `SELECT user_id, full_name, email
     FROM users
     WHERE role = 'learner'`
  );

  res.render("learners", { learners: result.rows });
});

/* ===============================
   SETTINGS
================================ */
app.get("/settings", requireAuth, loadUserFromDB, (req, res) => {
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
app.post("/profile/avatar", requireAuth, loadUserFromDB, upload.single("avatar"), async (req, res) => {
  if (!req.file?.path) return res.redirect("/settings?error=Upload failed");

  await db.query(
    `UPDATE users SET avatar=$1 WHERE user_id=$2`,
    [req.file.path, req.user.userId]
  );

  res.redirect("/settings?success=Avatar updated!");
});

/* ===============================
   PROFILE UPDATE
================================ */
app.post("/profile/update", requireAuth, loadUserFromDB, async (req, res) => {
  const { fullName, email } = req.body;

  await db.query(
    `UPDATE users SET full_name=$1, email=$2 WHERE user_id=$3`,
    [fullName, email, req.user.userId]
  );

  res.redirect("/settings?success=Profile updated!");
});

/* ===============================
   PASSWORD CHANGE
================================ */
app.post("/profile/password", requireAuth, loadUserFromDB, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await db.query(
    `SELECT password_hash FROM users WHERE user_id=$1`,
    [req.user.userId]
  );

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) return res.redirect("/settings?error=Wrong password");

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query(
    `UPDATE users SET password_hash=$1 WHERE user_id=$2`,
    [hashed, req.user.userId]
  );

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
