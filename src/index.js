require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const db = require("./db/postgres");

// Routes
const authRoutes = require("./routes/auth");
const calendarRoutes = require("./routes/calendar");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   BASIC MIDDLEWARE
================================ */
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: true })); // parse form submissions
app.use(cookieParser());

/* ===============================
   STATIC FILES & VIEWS
================================ */
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===============================
   GLOBAL LAYOUT VARIABLES
================================ */
app.use(async (req, res, next) => {
  res.locals.pageTitle = "The Tech Lab Dashboard";
  res.locals.activePage = "";
  res.locals.user = null;

  const token = req.cookies?.token;
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Load user for sidebar/avatar
      const result = await db.query(
        `SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = $1`,
        [decoded.userId]
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
    } catch (err) {
      req.user = null;
    }
  }
  next();
});

/* ===============================
   AUTH ROUTES
================================ */
app.use("/", authRoutes);

/* ===============================
   CORE PAGES
================================ */
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) =>
  res.render("login", { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID })
);

/* ===============================
   DASHBOARD
================================ */
const { requireAuth, requireMentor } = require("./middleware/auth");

app.get("/dashboard", requireAuth, (req, res) => {
  res.locals.pageTitle = "Dashboard | The Tech Lab";
  res.locals.activePage = "dashboard";
  res.render("dashboard");
});

/* ===============================
   CALENDAR
================================ */
app.use("/calendar", requireAuth, calendarRoutes);

/* ===============================
   PROFILE AVATAR UPLOAD
================================ */
const cloudinaryStorage = require("./config/cloudinaryStorage");
const upload = multer({ storage: cloudinaryStorage });

app.post("/profile/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file?.path) return res.redirect("/settings?error=Upload failed");

  await db.query(`UPDATE users SET avatar=$1 WHERE user_id=$2`, [
    req.file.path,
    req.user.userId,
  ]);

  res.redirect("/settings?success=Avatar updated!");
});

/* ===============================
   SETTINGS
================================ */
app.get("/settings", requireAuth, (req, res) => {
  res.render("settings", {
    successMessage: req.query.success || "",
    errorMessage: req.query.error || "",
  });
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
