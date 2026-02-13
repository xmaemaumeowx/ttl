// routes/projects.js
const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

/* ===============================
   AUTH MIDDLEWARE
================================ */
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

/* ===============================
   PERMISSION CHECK
================================ */
async function canEditProject(req, res, next) {
  try {
    // Mentors can edit any project
    if (req.user.role === "mentor") return next();

    // Learners can only edit their own projects
    const result = await db.query(
      `SELECT 1 FROM projects WHERE project_id = $1 AND learner_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0)
      return res.redirect("/projects?error=Unauthorized");

    next();
  } catch (err) {
    console.error("Permission check failed:", err);
    res.redirect("/projects?error=Permission check failed");
  }
}

/* ===============================
   LOAD USER MIDDLEWARE
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
   LIST PROJECTS
================================ */
router.get("/", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    let projects;

    if (req.user.role === "mentor") {
      const result = await db.query(
        `SELECT p.*, 
                u.full_name AS learner_name, 
                lt.track_name
         FROM projects p
         LEFT JOIN users u ON p.learner_id = u.user_id
         LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
         ORDER BY p.created_at DESC`
      );
      projects = result.rows;
    } else {
      const result = await db.query(
        `SELECT p.*, lt.track_name
         FROM projects p
         LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
         WHERE p.learner_id = $1
         ORDER BY p.created_at DESC`,
        [req.user.userId]
      );
      projects = result.rows;
    }

    res.render("projects", {
      user: req.user,
      projects,
      success: req.query.success || "",
      error: req.query.error || "",
    });

  } catch (err) {
    console.error("Error fetching projects:", err);
    res.render("projects", {
      user: req.user,
      projects: [],
      success: "",
      error: "Failed to load projects",
    });
  }
});

/* ===============================
   CREATE PROJECT (MENTOR ONLY)
================================ */
router.get("/create", requireAuth, loadUserFromDB, async (req, res) => {
  if (req.user.role !== "mentor")
    return res.redirect("/projects?error=Unauthorized");

  try {
    const tracks = await db.query(
      `SELECT track_id, track_name FROM learning_tracks ORDER BY track_name`
    );

    const learners = await db.query(
      `SELECT user_id, full_name FROM users WHERE role='learner' ORDER BY full_name`
    );

    res.render("project-create", {
      user: req.user,
      tracks: tracks.rows,
      learners: learners.rows,
      error: req.query.error || "",
    });

  } catch (err) {
    console.error(err);
    res.redirect("/projects?error=Failed to load create page");
  }
});

router.post("/create", requireAuth, async (req, res) => {
  if (req.user.role !== "mentor")
    return res.redirect("/projects?error=Unauthorized");

  try {
    const {
      name,
      description,
      start_date,
      end_date,
      technology_stack,
      status,
      track_id,
      github_link,
      live_link,
      learner_id,
    } = req.body;

    await db.query(
      `INSERT INTO projects
       (name, description, start_date, end_date,
        technology_stack, status, track_id,
        github_link, live_link, learner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        name,
        description,
        start_date || null,
        end_date || null,
        technology_stack,
        status,
        track_id || null,
        github_link,
        live_link,
        learner_id,
      ]
    );

    res.redirect("/projects?success=Project created successfully");

  } catch (err) {
    console.error(err);
    res.redirect("/projects/create?error=Failed to create project");
  }
});

/* ===============================
   EDIT PROJECT
================================ */
router.get("/edit/:id", requireAuth, loadUserFromDB, canEditProject, async (req, res) => {
  try {
    const projectResult = await db.query(
      `SELECT * FROM projects WHERE project_id = $1`,
      [req.params.id]
    );

    const project = projectResult.rows[0];
    if (!project)
      return res.redirect("/projects?error=Project not found");

    const tracks = await db.query(
      `SELECT track_id, track_name FROM learning_tracks ORDER BY track_name`
    );

    res.render("project-edit", {
      user: req.user,
      project,
      tracks: tracks.rows,
      error: req.query.error || "",
    });

  } catch (err) {
    console.error(err);
    res.redirect("/projects?error=Failed to load edit page");
  }
});

router.post("/edit/:id", requireAuth, loadUserFromDB, canEditProject, async (req, res) => {
  try {
    const {
      name,
      description,
      start_date,
      end_date,
      technology_stack,
      status,
      track_id,
      github_link,
      live_link,
    } = req.body;

    await db.query(
      `UPDATE projects
       SET name=$1,
           description=$2,
           start_date=$3,
           end_date=$4,
           technology_stack=$5,
           status=$6,
           track_id=$7,
           github_link=$8,
           live_link=$9,
           updated_at=NOW()
       WHERE project_id=$10`,
      [
        name,
        description,
        start_date || null,
        end_date || null,
        technology_stack,
        status,
        track_id || null,
        github_link,
        live_link,
        req.params.id,
      ]
    );

    res.redirect("/projects?success=Project updated successfully");

  } catch (err) {
    console.error(err);
    res.redirect(`/projects/edit/${req.params.id}?error=Failed to update project`);
  }
});

/* ===============================
   DELETE PROJECT (MENTOR ONLY)
================================ */
router.post("/delete/:id", requireAuth, loadUserFromDB, async (req, res) => {
  if (req.user.role !== "mentor")
    return res.redirect("/projects?error=Unauthorized");

  try {
    await db.query(`DELETE FROM projects WHERE project_id=$1`, [
      req.params.id,
    ]);

    res.redirect("/projects?success=Project deleted successfully");

  } catch (err) {
    console.error(err);
    res.redirect("/projects?error=Failed to delete project");
  }
});

/* ===============================
   PROJECT DETAILS
   (⚠️ MUST BE LAST)
================================ */
router.get("/:id", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, 
              u.full_name AS learner_name, 
              lt.track_name
       FROM projects p
       LEFT JOIN users u ON p.learner_id = u.user_id
       LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
       WHERE p.project_id = $1`,
      [req.params.id]
    );

    const project = result.rows[0];

    if (!project)
      return res.redirect("/projects?error=Project not found");

    res.render("project-detail", {
      user: req.user,
      project,
    });

  } catch (err) {
    console.error(err);
    res.redirect("/projects?error=Failed to load project");
  }
});

module.exports = router;
