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

async function loadUserFromDB(req, res, next) {
  if (!req.user?.userId) return next();

  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, role, avatar
       FROM users
       WHERE user_id = $1`,
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
    console.error("User load error:", err);
    next();
  }
}

/* ===============================
   GET REPORTS
================================ */

router.get("/", requireAuth, loadUserFromDB, async (req, res) => {
  try {
    res.locals.pageTitle = "Reports | The Tech Lab";
    res.locals.activePage = "reports";

    const learnerId = req.user.userId;

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
      if (progress === 100 && total > 0) status = "Completed";
      else if (progress > 0) status = "In Progress";

      return {
        track_name: track.track_name,
        total_projects: total,
        completed_projects: completed,
        progress,
        status
      };
    });

    res.render("reports", {
      reports
    });

  } catch (err) {
    console.error("Reports error:", err);
    res.render("reports", { reports: [] });
  }
});

module.exports = router;
