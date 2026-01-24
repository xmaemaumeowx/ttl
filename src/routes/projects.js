// src/routes/projects.js
const express = require("express");
const router = express.Router();
const db = require("../db/postgres");
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require("../models/projectModel");
const { requireAuth, requireMentor } = require("../middleware/auth");

// ---- List projects ----
router.get("/", requireAuth, async (req, res) => {
  try {
    const projects = await getProjects(req.user.userId, req.user.role);
    res.render("projects", {
      pageTitle: "Projects | The Tech Lab",
      activePage: "projects",
      user: res.locals.user,
      projects,
      successMessage: req.query.success || "",
      errorMessage: req.query.error || "",
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.render("projects", {
      pageTitle: "Projects | The Tech Lab",
      activePage: "projects",
      user: res.locals.user,
      projects: [],
      errorMessage: "Failed to load projects",
    });
  }
});

// ---- View single project ----
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect("/projects?error=Project not found");

    // Prevent learners from viewing others’ projects
    if (req.user.role === "learner" && project.learner_id !== req.user.userId) {
      return res.redirect("/projects?error=Access denied");
    }

    res.render("project-detail", { pageTitle: "Project Detail", project });
  } catch (err) {
    console.error("Error fetching project:", err);
    res.redirect("/projects?error=Failed to load project");
  }
});

// ---- Create project (mentor only) ----
router.get("/create", requireAuth, requireMentor, async (req, res) => {
  try {
    const tracksResult = await db.query(
      "SELECT track_id, track_name FROM learning_tracks ORDER BY track_name"
    );
    const learnersResult = await db.query(
      "SELECT user_id, full_name FROM users WHERE role='learner' ORDER BY full_name"
    );
    res.render("project-create", {
      pageTitle: "Create Project",
      tracks: tracksResult.rows,
      learners: learnersResult.rows,
      successMessage: req.query.success || "",
      errorMessage: req.query.error || "",
    });
  } catch (err) {
    console.error("Error loading create project page:", err);
    res.redirect("/projects?error=Failed to load create page");
  }
});

router.post("/create", requireAuth, requireMentor, async (req, res) => {
  try {
    const newProject = await createProject(req.body);
    res.redirect(`/projects/${newProject.project_id}?success=Project created successfully`);
  } catch (err) {
    console.error("Error creating project:", err);
    res.redirect("/projects/create?error=Failed to create project");
  }
});

// ---- Edit project ----
router.get("/edit/:id", requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect("/projects?error=Project not found");

    // Prevent learners from editing others’ projects
    if (req.user.role === "learner" && project.learner_id !== req.user.userId) {
      return res.redirect("/projects?error=Access denied");
    }

    const tracksResult = await db.query(
      "SELECT track_id, track_name FROM learning_tracks ORDER BY track_name"
    );
    res.render("project-edit", {
      pageTitle: "Edit Project",
      project,
      tracks: tracksResult.rows,
      successMessage: req.query.success || "",
      errorMessage: req.query.error || "",
    });
  } catch (err) {
    console.error("Error loading edit page:", err);
    res.redirect("/projects?error=Failed to load edit page");
  }
});

router.post("/edit/:id", requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);

    if (!project) return res.redirect("/projects?error=Project not found");
    if (req.user.role === "learner" && project.learner_id !== req.user.userId) {
      return res.redirect("/projects?error=Access denied");
    }

    await updateProject(req.params.id, req.body);
    res.redirect(`/projects/${req.params.id}?success=Project updated successfully`);
  } catch (err) {
    console.error("Error updating project:", err);
    res.redirect(`/projects/edit/${req.params.id}?error=Failed to update project`);
  }
});

// ---- Delete project (mentor only) ----
router.post("/delete/:id", requireAuth, requireMentor, async (req, res) => {
  try {
    await deleteProject(req.params.id);
    res.redirect("/projects?success=Project deleted successfully");
  } catch (err) {
    console.error("Error deleting project:", err);
    res.redirect("/projects?error=Failed to delete project");
  }
});

module.exports = router;
