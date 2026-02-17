// src/routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/reports', requireAuth, async (req, res) => {
  const userId = req.user?.user_id ?? req.user?.userId;

  try {
    if (!userId) return res.status(401).send("Missing user id. Please log in again.");

    // MENTOR VIEW
    if (req.user.role === 'mentor') {
      const result = await db.query(
        `
        SELECT
          lt.track_id,
          lt.track_name,
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

    // LEARNER VIEW (your current query shows projects; keep as-is but fix param)
    const result = await db.query(
      `
      SELECT name, start_date, end_date, status
      FROM projects
      WHERE user_id = $1
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