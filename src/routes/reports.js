const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

function requireMentor(req, res, next) {
  if (req.user.role !== "mentor") return res.redirect("/dashboard");
  next();
}

router.get("/", requireAuth, requireMentor, async (req, res) => {
  try {
    // Learners under mentor
    const learners = await db.query(
      `SELECT u.user_id, u.full_name
       FROM mentor_learner ml
       JOIN users u ON ml.user_id = u.user_id
       WHERE ml.mentor_id = $1`,
      [req.user.userId]
    );

    // Course progress
    const courses = await db.query(
      `SELECT ce.user_id, c.course_name, ce.progress
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.course_id
       WHERE ce.user_id IN (
         SELECT user_id FROM mentor_learner WHERE mentor_id = $1
       )`,
      [req.user.userId]
    );

    // Projects
    const projects = await db.query(
      `SELECT p.*, u.full_name
       FROM projects p
       JOIN users u ON p.learner_id = u.user_id
       WHERE p.mentor_id = $1`,
      [req.user.userId]
    );

    res.render("mentor-progress", {
      pageTitle: "Reports | The Tech Lab",
      activePage: "reports",
      learners: learners.rows,
      courses: courses.rows,
      projects: projects.rows,
    });
  } catch (err) {
    console.error("Reports error:", err);
    res.render("mentor-progress", {
      learners: [],
      courses: [],
      projects: [],
    });
  }
});

module.exports = router;
