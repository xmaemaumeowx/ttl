const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /courses
router.get('/courses', requireAuth, async (req, res) => {
  try {

    // ===============================
    // MENTOR VIEW
    // ===============================
    if (req.user.role === 'mentor') {

      const result = await db.query(`
        SELECT 
          lt.track_name,
          c.course_name,
          c.description,
          c.order_no
        FROM courses c
        JOIN learning_tracks lt 
          ON c.track_id = lt.track_id
        WHERE lt.mentor_id = $1
        ORDER BY lt.track_name, c.order_no;
      `, [req.user.user_id]);

      return res.render('courses', {
        courses: result.rows,
        user: req.user,
        activePage: 'courses'
      });
    }

    // ===============================
    // LEARNER VIEW
    // ===============================
    const result = await db.query(`
      SELECT 
        lt.track_name,
        c.course_name,
        c.description,
        c.order_no
      FROM enrollments e
      JOIN learning_tracks lt 
        ON e.track_id = lt.track_id
      JOIN courses c 
        ON lt.track_id = c.track_id
      WHERE e.user_id = $1
      ORDER BY lt.track_name, c.order_no;
    `, [req.user.user_id]);

    res.render('courses', {
      courses: result.rows,
      user: req.user,
      activePage: 'courses'
    });

  } catch (err) {
    console.error("Courses error:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
