const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

// Learner-only access
function requireLearner(req, res, next) {
  if (req.user.role !== "learner") return res.redirect("/dashboard");
  next();
}

router.get("/", requireAuth, requireLearner, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        c.course_name,
        ce.progress
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.course_id
      WHERE ce.user_id = $1
      ORDER BY c.course_name
      `,
      [req.user.userId]
    );

    // Compute milestones server-side
    const reports = result.rows.map(row => {
      let milestones = "Not started";
      let status = "Pending";

      if (row.progress >= 100) {
        milestones = "All milestones completed";
        status = "Completed";
      } else if (row.progress >= 75) {
        milestones = "Major milestones reached";
        status = "On Track";
      } else if (row.progress >= 50) {
        milestones = "Mid-course milestone reached";
        status = "In Progress";
      } else if (row.progress > 0) {
        milestones = "Initial milestone reached";
        status = "In Progress";
      }

      return {
        course_name: row.course_name,
        progress: row.progress,
        milestones,
        status
      };
    });

    res.render("reports", {
      pageTitle: "My Learning Reports | The Tech Lab",
      activePage: "reports",
      reports,
      success: req.query.success || "",
      error: req.query.error || ""
    });

  } catch (err) {
    console.error("Learner reports error:", err);
    res.status(500).render("reports", {
      pageTitle: "My Learning Reports | The Tech Lab",
      activePage: "reports",
      reports: [],
      success: "",
      error: "Unable to load learning reports"
    });
  }
});

module.exports = router;
