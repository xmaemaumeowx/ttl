// src/routes/reports.js
const express = require("express");
const router = express.Router();
const db = require("../db/postgres");
const { requireAuth, requireMentor } = require("../middleware/auth");

// ---- Mentor Progress Dashboard ----
router.get("/", requireAuth, requireMentor, async (req, res) => {
  try {
    const mentorId = req.user.userId;

    // ---- Fetch learners assigned to this mentor ----
    const learnersResult = await db.query(
      `SELECT u.user_id, u.full_name
       FROM users u
       JOIN mentor_learner ml ON ml.user_id = u.user_id
       WHERE ml.mentor_id = $1
       ORDER BY u.full_name`,
      [mentorId]
    );
    const learners = learnersResult.rows;

    // ---- Fetch course progress for each learner ----
    const courseProgress = [];
    for (const learner of learners) {
      const coursesResult = await db.query(
        `SELECT c.course_id, c.course_name, c.status, c.updated_at
         FROM learner_courses lc
         JOIN courses c ON lc.course_id = c.course_id
         WHERE lc.learner_id = $1`,
        [learner.user_id]
      );

      // Fetch modules and lessons
      const courses = [];
      for (const course of coursesResult.rows) {
        const modulesResult = await db.query(
          `SELECT m.module_id, m.module_name, m.module_status
           FROM course_modules m
           WHERE m.course_id = $1
           ORDER BY m.module_order`,
          [course.course_id]
        );

        const modules = [];
        for (const mod of modulesResult.rows) {
          const lessonsResult = await db.query(
            `SELECT l.lesson_id, l.lesson_name, ll.lesson_status
             FROM module_lessons l
             LEFT JOIN learner_lessons ll 
             ON ll.lesson_id = l.lesson_id AND ll.learner_id = $1
             WHERE l.module_id = $2
             ORDER BY l.lesson_order`,
            [learner.user_id, mod.module_id]
          );

          modules.push({
            module_name: mod.module_name,
            module_status: mod.module_status,
            lessons: lessonsResult.rows.map((l) => ({
              lesson_name: l.lesson_name,
              lesson_status: l.lesson_status || "Not Started",
            })),
          });
        }

        courses.push({
          course_name: course.course_name,
          status: course.status,
          modules,
        });
      }

      courseProgress.push({
        learner,
        courses,
      });
    }

    // ---- Fetch projects per learner ----
    const projects = [];
    for (const learner of learners) {
      const projectsResult = await db.query(
        `SELECT p.project_id, p.name, p.status, p.github_link, p.live_link
         FROM projects p
         WHERE p.learner_id = $1
         ORDER BY p.created_at DESC`,
        [learner.user_id]
      );
      projects.push({
        learner,
        projects: projectsResult.rows,
      });
    }

    // Render the consolidated mentor dashboard
    res.render("mentor-progress", {
      pageTitle: "Mentor Progress Dashboard | The Tech Lab",
      activePage: "reports",
      user: res.locals.user,
      courseProgress,
      projects,
      successMessage: req.query.success || "",
      errorMessage: req.query.error || "",
    });
  } catch (err) {
    console.error("Error loading mentor progress:", err);
    res.status(500).send("Server error while loading mentor dashboard");
  }
});

module.exports = router;
