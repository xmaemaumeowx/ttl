const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/reports', requireAuth, async (req, res) => {
  try {
    console.log("Logged in user:", req.user);

    // MENTOR VIEW
    if (req.user.role === 'mentor') {

      const result = await db.query(`
        SELECT 
          lt.track_name,
          COUNT(e.user_id) AS enrolled_count
        FROM learning_tracks lt
        LEFT JOIN enrollments e ON lt.track_id = e.track_id
        WHERE lt.mentor_id = $1
        GROUP BY lt.track_name
        ORDER BY lt.track_name
      `, [req.user.user_id]);

      console.log("Mentor rows:", result.rows);

      return res.render('mentor-report', {
        mentorReport: result.rows,
        activePage: 'reports',
        user: req.user
      });
    }

    // LEARNER VIEW
    const result = await db.query(`
      SELECT 
        lt.track_name,

        ROUND(
          COALESCE(SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END),0) 
          * 100.0 / 
          GREATEST(COUNT(p.project_id),1)
        ) AS progress,

        COALESCE(SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END),0) 
          AS completed_projects,

        COUNT(p.project_id) AS total_projects,

        CASE
          WHEN COUNT(p.project_id) = 0 THEN 'Not Started'
          WHEN SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END) = COUNT(p.project_id)
               THEN 'Completed'
          ELSE 'In Progress'
        END AS status

      FROM enrollments e
      JOIN learning_tracks lt ON e.track_id = lt.track_id
      LEFT JOIN projects p ON lt.track_id = p.track_id
      WHERE e.user_id = $1
      GROUP BY lt.track_name
      ORDER BY lt.track_name;
    `, [req.user.user_id]);

    res.render('reports', {
      reports: result.rows,
      activePage: 'reports',
      user: req.user
    });

  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
