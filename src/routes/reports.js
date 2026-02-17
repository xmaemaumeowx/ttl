const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/reports', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.user_id ?? req.user?.userId;
    if (!userId) return res.status(401).send("Missing user id. Please log in again.");

    // =========================
    // MENTOR VIEW
    // =========================
    if (req.user.role === 'mentor') {
      const result = await db.query(
        `
        SELECT
          lt.track_id,
          lt.track_name,
          e.user_id,
          COUNT(e.user_id)::int AS enrolled_count
        FROM learning_tracks lt
        LEFT JOIN enrollments e ON lt.track_id = e.track_id
        WHERE lt.mentor_id = $1
        GROUP BY lt.track_id, lt.track_name
        ORDER BY lt.track_name;
        `,
        [userId]
      );

      return res.render('mentor-report', {
        mentorReport: result.rows,
        activePage: 'reports',
        user: req.user
      });
    }

    // =========================
    // LEARNER VIEW (progress per track)
    // Supports projects.user_id OR projects.learner_id
    // Uses DISTINCT to prevent double-counting.
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
        )::int AS progress,

        CASE
          WHEN COUNT(DISTINCT p.project_id) = 0 THEN 'Not Started'
          WHEN COUNT(DISTINCT CASE WHEN p.status = 'Completed' THEN p.project_id END)
               = COUNT(DISTINCT p.project_id) THEN 'Completed'
          ELSE 'In Progress'
        END AS status

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
      [userId]
    );

    return res.render('reports', {
      reports: result.rows,
      activePage: 'reports',
      user: req.user
    });
  } catch (err) {
    console.error('Reports error:', err);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;