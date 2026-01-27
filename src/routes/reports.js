const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

function requireLearner(req, res, next) {
  if (req.user.role !== "learner") return res.redirect("/dashboard");
  next();
}

router.get("/", requireAuth, requireLearner, async (req, res) => {
  try {
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
      ORDER BY lt.track_name
      `,
      [req.user.userId]
    );

    const reports = result.rows.map(row => {
      const total = Number(row.total_projects);
      const completed = Number(row.completed_projects);
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      let milestones = "Not started";
      let status = "Pending";

      if (progress === 100) {
        milestones = "All milestones completed";
        status = "Completed";
      } else if (progress >= 50) {
        milestones = "Mid-track milestone reached";
        status = "In Progress";
      } else if (progress > 0) {
        milestones = "Initial milestone reached";
        status = "In Progress";
      }

      return {
        track_name: row.track_name,
        progress,
        milestones,
        status
      };
    });

    res.render("reports", {
      pageTitle: "My Learning Reports | The Tech Lab",
      activePage: "reports",
      reports,
      success: "",
      error: ""
    });

  } catch (err) {
    console.error("Learner reports error:", err);
    res.status(500).render("reports", {
      pageTitle: "My Learning Reports | The Tech Lab",
      activePage: "reports",
      reports: [],
      success: "",
      error: "Unable to generate learning report"
    });
  }
});

module.exports = router;
