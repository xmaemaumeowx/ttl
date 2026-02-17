const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/courses', requireAuth, async (req, res) => {
  try {
    let result;

    if (req.user.role === 'mentor') {
      // Mentor: courses for tracks mentored by this user
      result = await db.query(
        `
        SELECT
          c.course_id,
          c.course_name,
          c.description,
          c.order_no,
          lt.track_id,
          lt.track_name
        FROM courses c
        JOIN learning_tracks lt ON c.track_id = lt.track_id
        WHERE lt.mentor_id = $1
        ORDER BY lt.track_name, c.order_no;
        `,
        [req.user.user_id]
      );
    } else {
      // Learner: courses for tracks the learner is enrolled in
      result = await db.query(
        `
        SELECT
          c.course_id,
          c.course_name,
          c.description,
          c.order_no,
          lt.track_id,
          lt.track_name
        FROM enrollments e
        JOIN learning_tracks lt ON e.track_id = lt.track_id
        JOIN courses c ON c.track_id = lt.track_id
        WHERE e.user_id = $1
        ORDER BY lt.track_name, c.order_no;
        `,
        [req.user.user_id]
      );
    }

    return res.render('courses', {
      courses: result.rows,
      activePage: 'courses',
      user: req.user
    });
  } catch (err) {
    console.error('Error fetching courses:', err);

    // IMPORTANT: always pass courses to avoid "courses is not defined"
    return res.status(500).render('courses', {
      courses: [],
      activePage: 'courses',
      user: req.user,
      error: 'Unable to load courses at the moment.'
    });
  }
});

module.exports = router;