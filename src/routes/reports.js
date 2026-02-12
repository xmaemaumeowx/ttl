const express = require("express");
const router = express.Router();
const db = require("../db/postgres"); // ✅ FIXED

// GET /reports
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const learnerId = req.user.userId; // ✅ FIXED

    const result = await db.query(
      `
      SELECT
        lt.track_name,
        COUNT(p.project_id) AS total_projects,
        COUNT(CASE WHEN p.status = 'Completed' THEN 1 END) AS completed_projects
      FROM learning_tracks lt
      LEFT JOIN projects p 
        ON p.track_id = lt.track_id 
        AND p.learner_id = $1
      GROUP BY lt.track_name
      ORDER BY lt.track_name ASC
      `,
      [learnerId]
    );

    const reports = result.rows.map(track => {
      const total = parseInt(track.total_projects) || 0;
      const completed = parseInt(track.completed_projects) || 0;

      let progress = 0;
      if (total > 0) {
        progress = Math.round((completed / total) * 100);
      }

      let status = "Not Started";
      if (progress === 100 && total > 0) {
        status = "Completed";
      } else if (progress > 0) {
        status = "In Progress";
      }

      return {
        track_name: track.track_name,
        progress,
        milestones: completed,
        status
      };
    });

    res.render("reports", {
      reports,
      user: res.locals.user || null,
      success: null,
      error: null
    });

  } catch (err) {
    console.error("Reports error:", err);
    res.render("reports", {
      reports: [],
      user: res.locals.user || null,
      success: null,
      error: "Failed to load reports."
    });
  }
});

module.exports = router;
