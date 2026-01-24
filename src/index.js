require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const bcrypt = require("bcrypt");
const db = require("./db/postgres"); // <- PostgreSQL module
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// ---- JWT DECODE MIDDLEWARE ----
app.use((req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
});

// ---- UNIVERSAL USER LOADER FOR SIDEBAR/AVATAR ----
async function loadUserFromDB(req, res, next) {
  if (!req.user?.userId) {
    res.locals.user = {};
    return next();
  }
  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = $1`,
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
    console.error("Error loading user for sidebar:", err);
    res.locals.user = {};
    next();
  }
}

// ---- STATIC & VIEWS ----
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---- AUTH ROUTES ----
const authRoutes = require("./routes/auth");
app.use("/", authRoutes);

// ---- AUTH CHECK ----
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

// ---- ROUTES ----

// Home & Login
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
  if (!googleClientId) console.warn("⚠️ GOOGLE_CLIENT_ID is not set!");
  res.render("login", { GOOGLE_CLIENT_ID: googleClientId });
});

// Dashboard
app.get('/dashboard', requireAuth, loadUserFromDB, async (req, res) => {
  try {
    // Fetch announcements from DB
    const result = await db.query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`);
    const announcements = result.rows;

    res.render('dashboard', {
      pageTitle: "Dashboard | The Tech Lab",
      activePage: "dashboard",
      user: res.locals.user,
      announcements
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.render('dashboard', {
      pageTitle: "Dashboard | The Tech Lab",
      activePage: "dashboard",
      user: res.locals.user,
      announcements: []
    });
  }
});


//Projects
app.get("/projects", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    let projects;

    if (res.locals.user.role === "mentor") {
      // Mentor: show projects assigned to their learners
      const sql = `
        SELECT p.*, u.full_name AS learner_name, lt.track_name
        FROM projects p
        LEFT JOIN users u ON p.learner_id = u.user_id
        LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
        WHERE p.mentor_id = $1
        ORDER BY p.created_at DESC
      `;
      const result = await db.query(sql, [res.locals.user.userId]);
      projects = result.rows;
    } else {
      // Learner: show their own projects
      const sql = `
        SELECT p.*, lt.track_name
        FROM projects p
        LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
        WHERE p.learner_id = $1
        ORDER BY p.created_at DESC
      `;
      const result = await db.query(sql, [res.locals.user.userId]);
      projects = result.rows;
    }

    res.render("projects", {
      pageTitle: "Projects | The Tech Lab",
      activePage: "projects",
      user: res.locals.user,
      projects
    });
  } catch (err) {
    console.error("Error loading projects:", err);
    res.render("projects", {
      pageTitle: "Projects | The Tech Lab",
      activePage: "projects",
      user: res.locals.user,
      projects: []
    });
  }
});

// Calendar
app.get("/calendar", requireAuth, loadUserFromDB, (req, res) => {
  res.render("calendar", {
    pageTitle: "Calendar | The Tech Lab",
    activePage: "calendar",
    user: res.locals.user,
  });
});
const calendarRoutes = require('./routes/calendar');
app.use('/calendar', calendarRoutes);


// Learners (mentor view)
app.get("/learners", requireAuth, loadUserFromDB, async (req, res) => {
  const mentorId = req.user.userId;
  try {
    const sql = `
      SELECT u.user_id, u.full_name, u.email, u.role,
             lt.track_id, lt.track_name, lt.description AS track_description, lt.duration_weeks
      FROM mentor_learner ml
      JOIN users u ON ml.user_id = u.user_id
      JOIN learning_tracks lt ON ml.track_id = lt.track_id
      WHERE ml.mentor_id = $1
      ORDER BY lt.track_name, u.full_name
    `;
    const result = await db.query(sql, [mentorId]);
    res.render("learners", {
      pageTitle: "My Learners",
      activePage: "learners",
      learners: result.rows,
    });
  } catch (err) {
    console.error("Error fetching learners:", err);
    res.status(500).send("Error fetching learners");
  }
});

// Reports
app.get("/reports", requireAuth, loadUserFromDB, async (req, res) => {
  res.render("reports", {
    courses: [
      {
        course_name: "Data Analytics Foundations",
        status: "In Progress",
        last_updated: "2024-05-23",
        modules: [
          {
            module_name: "Introduction to Data Analytics",
            status: "Completed",
            last_updated: "2024-05-12",
            lessons: [
              { lesson_name: "What is Data Analytics?", status: "Completed", last_updated: "2024-05-10" },
              { lesson_name: "Key Terms", status: "Completed", last_updated: "2024-05-12" }
            ]
          }
        ]
      }
    ],
    activePage: "reports",
  });
});

// Settings
app.get("/settings", requireAuth, loadUserFromDB, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = $1`,
      [userId]
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
    console.error("Error fetching user info:", err);
    res.status(500).send("Unable to load settings page.");
  }
});

// AVATAR UPLOAD
const cloudinaryStorage = require("./config/cloudinaryStorage");
const upload = multer({ storage: cloudinaryStorage });

// AVATAR UPLOAD (CLOUDINARY)
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


// PROFILE UPDATE
app.post("/profile/update", requireAuth, async (req, res) => {
  const { fullName, email } = req.body;
  try {
    await db.query("UPDATE users SET full_name=$1, email=$2 WHERE user_id=$3", [fullName, email, req.user.userId]);
    res.redirect("/settings?success=Profile%20updated%20successfully!");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.redirect("/settings?error=Unable%20to%20update%20profile");
  }
});

// PASSWORD RESET
app.post("/profile/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await db.query("SELECT password_hash FROM users WHERE user_id=$1", [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.redirect("/settings?error=User%20not%20found");
    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) return res.redirect("/settings?error=Current%20password%20is%20incorrect");
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash=$1 WHERE user_id=$2", [hashed, req.user.userId]);
    res.redirect("/settings?success=Password%20changed%20successfully!");
  } catch (err) {
    console.error("Error resetting password:", err);
    res.redirect("/settings?error=Unable%20to%20reset%20password");
  }
});



app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// ---- START SERVER ----
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// -- REPORTS ---
const reportsRoutes = require('./routes/reports');
app.use('/reports', reportsRoutes);
