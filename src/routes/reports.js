// src/routes/reports.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /reports
router.get("/reports", async (req, res) => {
  try {
    const currentUser = res.locals.user;

    if (!currentUser?.userId) {
      return res.redirect("/login");
    }

    res.locals.pageTitle = "Reports | The Tech Lab";
    res.locals.activePage = "reports";

    // =========================
    // MENTOR VIEW
    // =========================
    if (currentUser.role === "mentor") {
      const result = await db.query(
        `
        SELECT
          lt.track_id,
          lt.track_name,
          COUNT(e.user_id)::int AS enrolled_count
        FROM learning_tracks lt
        LEFT JOIN enrollments e
          ON e.track_id = lt.track_id
        WHERE lt.mentor_id = $1
        GROUP BY lt.track_id, lt.track_name
        ORDER BY lt.track_name;
        `,
        [currentUser.userId]
      );

      return res.render("mentor-report", {
        mentorReport: result.rows || [],
        activePage: "reports",
        error: "",
      });
    }

    // =========================
    // LEARNER VIEW (progress per track)
    // returns: track_name, progress, completed_projects, total_projects
    // =========================
    const result = await db.query(
      `
      SELECT
        lt.track_id,
        lt.track_name,

        COUNT(DISTINCT p.project_id)::int AS total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'Completed' THEN p.project_id END)::int
          AS completed_projects,

        ROUND(
          COUNT(DISTINCT CASE WHEN p.status = 'Completed' THEN p.project_id END) * 100.0
          / GREATEST(COUNT(DISTINCT p.project_id), 1)
        )::int AS progress

      FROM enrollments e
      JOIN learning_tracks lt
        ON lt.track_id = e.track_id

      LEFT JOIN projects p
        ON p.track_id = lt.track_id
       AND (p.user_id = e.user_id OR p.learner_id = e.user_id)

      WHERE e.user_id = $1
      GROUP BY lt.track_id, lt.track_name
      ORDER BY lt.track_name;
      `,
      [currentUser.userId]
    );

    return res.render("reports", {
      reports: result.rows || [],
      activePage: "reports",
      error: "",
    });
  } catch (err) {
    console.error("Error loading reports:", err);

    // Render a safe page instead of raw 500 (helps debugging in UI)
    return res.status(500).render("reports", {
      reports: [],
      activePage: "reports",
      error: "Unable to load reports at the moment.",
    });
  }
});

module.exports = router;