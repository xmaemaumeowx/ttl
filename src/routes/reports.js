const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

// ---- MIDDLEWARE ----
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

function requireMentor(req, res, next) {
  if (req.user.role !== "mentor") return res.redirect("/dashboard");
  next();
}

// ---- REPORTS ROUTE ----
router.get("/", requireAuth, requireMentor, async (req, res) => {
  try {
    // Learners under this mentor
    const learnersResult = await db.query(
      `SELECT u.user_id, u.full_name
       FROM mentor_learner ml
       JOIN users u ON ml.user_id = u.user_id
       WHERE ml.mentor_id = $1
       ORDER BY u.full_name`,
      [req.user.userId]
    );
    const learners = learnersResult.rows;

    // Course progress for mentor's learners
    const coursesResult = await db.query(
      `SELECT ce.user_id, c.course_name, ce.progress
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.course_id
       WHERE ce.user_id IN (
         SELECT user_id FROM mentor_learner WHERE mentor_id = $1
       )
       ORDER BY ce.user_id, c.course_name`,
      [req.user.userId]
    );
    const courses = coursesResult.rows;

    // Projects assigned to mentor's learners
    const projectsResult = await db.query(
      `SELECT p.*, u.full_name AS learner_name
       FROM projects p
       JOIN users u ON p.learner_id = u.user_id
       WHERE p.mentor_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.userId]
    );
    const projects = projectsResult.rows;

    res.render("mentor-progress", {
      pageTitle: "Reports | The Tech Lab",
      activePage: "reports",
      learners,
      courses,
      projects,
      success: req.query.success || "",
      error: req.query.error || "",
    });
  } catch (err) {
    console.error("Reports error:", err);
    res.render("mentor-progress", {
      pageTitle: "Reports | The Tech Lab",
      activePage: "reports",
      learners: [],
      courses: [],
      projects: [],
      success: "",
      error: "Failed to load reports. Please try again later.",
    });
  }
});

module.exports = router;
