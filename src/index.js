require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
const multer = require('multer');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// ---- JWT DECODE MIDDLEWARE (CRITICAL!!) ----
app.use((req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
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
  if (!req.user || !req.user.userId) {
    res.locals.user = {};
    return next();
  }
  try {
    const result = await connection.execute(
      `SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = :userId`,
      [req.user.userId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const dbUser = result.rows[0] || {};
    res.locals.user = {
      avatar: dbUser.AVATAR || null,
      fullName: dbUser.FULL_NAME || "",
      email: dbUser.EMAIL || "",
      role: dbUser.ROLE || "",
      userId: dbUser.USER_ID || ""
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

// ---- ORACLE DB ----
let connection;
async function initDB() {
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    console.log("✅ Connected to Oracle DB");
  } catch (err) {
    console.error("❌ Oracle DB connection error:", err);
  }
}
initDB();
app.locals.db = connection;

// ---- AUTH CHECK ----
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

// ---- ROUTES ----
// Home
app.get("/", (req, res) => res.render("index"));

// Dashboard
app.get("/dashboard", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    const result = await connection.execute(
      `SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = :userId`,
      [req.user.userId], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const dbUser = result.rows[0];
    if (dbUser) {
      res.locals.user = {
        avatar: dbUser.AVATAR || null,
        fullName: dbUser.FULL_NAME || "",
        email: dbUser.EMAIL || "",
        role: dbUser.ROLE || "",
        userId: dbUser.USER_ID || ""
      };
    }
    res.render("dashboard", {
      pageTitle: "Dashboard | The Tech Lab",
      activePage: "dashboard"
    });
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).send("Unable to load dashboard.");
  }
});

// Calendar
app.get("/calendar", requireAuth, loadUserFromDB, (req, res) => {
  res.render("calendar", { activePage: "calendar" });
});

// Learners
app.get('/learners', requireAuth, loadUserFromDB, async (req, res) => {
  const mentorId = req.user.userId;
  try {
    const sql = `
      SELECT u.user_id, u.full_name, u.email, u.role,
             lt.track_id, lt.track_name, lt.description AS track_description, lt.duration_weeks
      FROM mentor_learner ml
      JOIN users u        ON ml.user_id = u.user_id
      JOIN learning_tracks lt ON ml.track_id = lt.track_id
      WHERE ml.mentor_id = :mentorId
      ORDER BY lt.track_name, u.full_name
    `;
    const result = await connection.execute(sql, [mentorId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.render('learners', {
      pageTitle: 'My Learners',
      activePage: 'learners',
      learners: result.rows
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
    activePage: "reports"
  });
});

// Settings
app.get("/settings", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    const result = await connection.execute(
      `SELECT user_id, full_name, email, role, avatar FROM users WHERE user_id = :userId`,
      [req.user.userId], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const dbUser = result.rows[0];
    if (dbUser) {
      res.locals.user = {
        avatar: dbUser.AVATAR || null,
        fullName: dbUser.FULL_NAME || "",
        email: dbUser.EMAIL || "",
        role: dbUser.ROLE || "",
        userId: dbUser.USER_ID || ""
      };
    }
    const successMessage = req.query.success || '';
    const errorMessage = req.query.error || '';
    res.render("settings", {
      pageTitle: "Settings | The Tech Lab",
      activePage: "settings",
      successMessage,
      errorMessage
    });
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).send("Unable to load settings page.");
  }
});

// AVATAR UPLOAD
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/avatars"));
  },
  filename: function (req, file, cb) {
    const uniqueName = `${req.user.userId}_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});
app.post("/profile/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.redirect("/settings?error=No%20file%20uploaded");
  }
  const userId = req.user.userId;
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  try {
    await connection.execute(
      "UPDATE users SET avatar = :avatar WHERE user_id = :userId",
      { avatar: avatarPath, userId },
      { autoCommit: true }
    );
    res.redirect("/settings?success=Avatar%20updated%20successfully!");
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.redirect("/settings?error=Failed%20to%20update%20avatar");
  }
});

// PROFILE UPDATE
app.post("/profile/update", requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { fullName, email } = req.body;
  try {
    await connection.execute(
      "UPDATE users SET full_name = :fullName, email = :email WHERE user_id = :userId",
      { fullName, email, userId },
      { autoCommit: true }
    );
    res.redirect("/settings?success=Profile%20updated%20successfully!");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.redirect("/settings?error=Unable%20to%20update%20profile");
  }
});

// PASSWORD RESET
app.post("/profile/password", requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await connection.execute(
      "SELECT password FROM users WHERE user_id = :userId",
      [userId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = result.rows[0];
    if (!user) {
      return res.redirect("/settings?error=User%20not%20found");
    }
    const matches = await bcrypt.compare(currentPassword, user.PASSWORD);
    if (!matches) {
      return res.redirect("/settings?error=Current%20password%20is%20incorrect");
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await connection.execute(
      "UPDATE users SET password = :password WHERE user_id = :userId",
      { password: hashed, userId },
      { autoCommit: true }
    );
    res.redirect("/settings?success=Password%20changed%20successfully!");
  } catch (err) {
    console.error("Error resetting password:", err);
    res.redirect("/settings?error=Unable%20to%20reset%20password");
  }
});

// Courses
app.get("/courses", requireAuth, loadUserFromDB, async (req, res) => {
  const userId = req.user.userId;
  const role = res.locals.user.role;
  try {
    if (role === "mentor") {
      // 1. Fetch mentor's courses
      const courseResult = await connection.execute(`
        SELECT 
          c.course_id, c.course_name AS name, c.description, c.author
        FROM courses c
        WHERE c.author = :mentorId
        ORDER BY c.course_name
      `, [userId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

      // 2. For all mentor courses, fetch assignments and materials in batch
      const courseIds = courseResult.rows.map(c => c.COURSE_ID);
      let assignmentsMap = {}, materialsMap = {};
      if (courseIds.length) {
        // Assignments batch
        const aResult = await connection.execute(
          `SELECT assignment_id, course_id, title, due_date, description 
           FROM assignments WHERE course_id IN (${courseIds.map((_,i)=>`:id${i}`).join(",")})`,
          Object.fromEntries(courseIds.map((id,i)=>[`id${i}`, id])),
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        assignmentsMap = aResult.rows.reduce((acc, a) => {
          const cid = a.COURSE_ID;
          if (!acc[cid]) acc[cid] = [];
          acc[cid].push({
            id: a.ASSIGNMENT_ID,
            title: a.TITLE,
            due_date: a.DUE_DATE,
            description: a.DESCRIPTION
          });
          return acc;
        }, {});
        // Materials batch
        const mResult = await connection.execute(
          `SELECT cm_id, course_id, title, file_path FROM course_materials WHERE course_id IN (${courseIds.map((_,i)=>`:cid${i}`).join(",")})`,
          Object.fromEntries(courseIds.map((id,i)=>[`cid${i}`, id])),
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        materialsMap = mResult.rows.reduce((acc, m) => {
          const cid = m.COURSE_ID;
          if (!acc[cid]) acc[cid] = [];
          acc[cid].push({
            id: m.ID,
            title: m.TITLE,
            link: m.FILE_PATH
          });
          return acc;
        }, {});
      }

      // 3. Assemble the full mentor courses list with assignments, materials arrays
      const courses = courseResult.rows.map(c => ({
        course_id: c.COURSE_ID,
        name: c.NAME,
        description: c.DESCRIPTION,
        assignments: assignmentsMap[c.COURSE_ID] || [],
        materials: materialsMap[c.COURSE_ID] || []
      }));

      res.render("courses", {
        courses,
        tracks: [], // to avoid ReferenceError
        pageTitle: "Courses | The Tech Lab",
        activePage: "courses"
      });
    } else {
      // ---- Learner view (same as before) ----
      const result = await connection.execute(`
        SELECT 
          c.track_id, 
          lt.track_name, 
          c.course_id,
          c.course_name, 
          c.description, 
          m.module_id, 
          m.module_title
        FROM enrollments e
        LEFT JOIN courses c ON e.track_id = c.track_id
        LEFT JOIN modules m ON c.course_id = m.course_id
        LEFT JOIN learning_tracks lt ON e.track_id = lt.track_id
        WHERE e.user_id = :userId
      `, [userId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

      const groupedTracks = {};
      result.rows.forEach(row => {
        if (!groupedTracks[row.TRACK_NAME]) {
          groupedTracks[row.TRACK_NAME] = { 
            track: row.TRACK_NAME,
            courses: {}
          };
        }
        const courseGroup = groupedTracks[row.TRACK_NAME].courses;
        if (!courseGroup[row.COURSE_ID]) {
          courseGroup[row.COURSE_ID] = {
            course_id: row.COURSE_ID,
            course_name: row.COURSE_NAME,
            description: row.DESCRIPTION,
            modules: []
          };
        }
        if (
          row.MODULE_ID && 
          !courseGroup[row.COURSE_ID].modules.some(m => m.module_id === row.MODULE_ID)
        ) {
          courseGroup[row.COURSE_ID].modules.push({
            module_id: row.MODULE_ID,
            module_title: row.MODULE_TITLE
          });
        }
      });
      const tracks = Object.values(groupedTracks).map(track => ({
        ...track,
        courses: Object.values(track.courses)
      }));

      res.render("courses", {
        courses: [],
        tracks,
        pageTitle: "Courses | The Tech Lab",
        activePage: "courses"
      });
    }
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).send("Error fetching courses");
  }
});

// -------------------- PROJECTS PAGE --------------------
app.get("/projects", requireAuth, loadUserFromDB, async (req, res) => {
  const role = res.locals.user.role;
  const userId = req.user.userId;
  try {
    let sql, params;
    if (role === "mentor") {
      // Mentor: show all projects where they are assigned as mentor, join learners
      sql = `
        SELECT 
          p.project_id, p.name, p.description, p.status, p.start_date, p.end_date,
          p.technology_stack, p.github_link, p.live_link, p.created_at, p.updated_at,
          p.track_id, p.mentor_id,
          u.user_id, u.full_name as learner_name
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE p.mentor_id = :mentorId
        ORDER BY p.start_date DESC
      `;
      params = [userId];
    } else {
      // Learner or others: show their own projects
      sql = `
        SELECT 
          p.project_id, p.name, p.description, p.status, p.start_date, p.end_date,
          p.technology_stack, p.github_link, p.live_link, p.created_at, p.updated_at,
          p.track_id, p.mentor_id
        FROM projects p
        WHERE p.user_id = :userId
        ORDER BY p.start_date DESC
      `;
      params = [userId];
    }

    const result = await connection.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.render("projects", {
      pageTitle: "Projects | The Tech Lab",
      activePage: "projects",
      projects: result.rows
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).send("Error fetching projects");
  }
});

// -------------------- PROJECT DETAILS --------------------
app.get("/projects/:id", requireAuth, loadUserFromDB, async (req, res) => {
  const projectId = req.params.id;

  try {
    const sql = `
      SELECT p.project_id, p.name, p.description, p.status, p.start_date, p.end_date,
             p.technology_stack, p.github_link, p.live_link, p.track_id, p.user_id,
             u.full_name AS user_name, lt.track_name
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      WHERE p.project_id = :projectId
    `;

    const result = await connection.execute(sql, [projectId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const project = result.rows[0];
    const successMessage = req.query.success || null;

    if (project) {
      res.render("project-detail", {
        project,
        pageTitle: `Project: ${project.NAME}`,
        successMessage
      });
    } else {
      res.status(404).send("Project not found");
    }
  } catch (err) {
    console.error("Error fetching project details:", err);
    res.status(500).send("Error fetching project details");
  }
});


// -------------------- EDIT PROJECT --------------------
app.get("/projects/edit/:id", requireAuth, loadUserFromDB, async (req, res) => {
  const projectId = req.params.id;

  try {
    const sql = `SELECT * FROM projects WHERE project_id = :projectId`;
    const result = await connection.execute(sql, [projectId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const project = result.rows[0];

    if (!project) return res.status(404).send("Project not found");

    const tracksResult = await connection.execute(
      `SELECT track_id, track_name FROM learning_tracks`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const tracks = tracksResult.rows;

    res.render("project-edit", {
      project,
      tracks,
      pageTitle: `Edit Project | ${project.NAME}`,
    });
  } catch (err) {
    console.error("Error fetching project for edit:", err);
    res.status(500).send("Error fetching project for edit");
  }
});

// POST update project
app.post("/projects/edit/:id", requireAuth, async (req, res) => {
  const projectId = req.params.id;
  const { name, description, status, start_date, end_date, technology_stack, github_link, live_link, track_id } = req.body;

  if (!name || !status || !start_date) {
    return res.status(400).send("Name, status, and start date are required.");
  }

  if (end_date && new Date(end_date) < new Date(start_date)) {
    return res.status(400).send("End date cannot be earlier than start date.");
  }

  const validStatuses = ["Planned", "Ongoing", "Completed"];
  const normalizedStatus = validStatuses.find(
    (s) => s.toLowerCase() === status.trim().toLowerCase()
  ) || "Planned";

  try {
    const sql = `
      UPDATE projects
      SET
        name = :name,
        description = :description,
        status = :status,
        start_date = TO_DATE(:start_date, 'YYYY-MM-DD'),
        end_date = CASE WHEN :end_date IS NULL OR :end_date = '' THEN NULL ELSE TO_DATE(:end_date, 'YYYY-MM-DD') END,
        technology_stack = :technology_stack,
        github_link = :github_link,
        live_link = :live_link,
        track_id = :track_id
      WHERE project_id = :projectId
    `;

    const params = {
      name: name?.trim() || null,
      description: description?.trim() || null,
      status: normalizedStatus,
      start_date,
      end_date,
      technology_stack: technology_stack?.trim() || null,
      github_link: github_link?.trim() || null,
      live_link: live_link?.trim() || null,
      track_id: track_id || null,
      projectId,
    };

    await connection.execute(sql, params, { autoCommit: true });
    res.redirect(`/projects/${projectId}`);
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).send("Error updating project. Check server logs.");
  }
});


// LOGOUT
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});
// -------------------- START SERVER --------------------
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));