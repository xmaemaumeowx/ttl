// src/routes/courses.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/courses', requireAuth, async (req, res) => {
  // IMPORTANT: your app uses different JWT shapes in different places.
  // Prefer req.user.user_id (used in reports.js/courses.js in your repo).
  // Fallback to req.user.userId if needed.
  const userId = req.user?.user_id ?? req.user?.userId;

  try {
    if (!userId) {
      // If this happens, JWT payload is inconsistent—fix at sign/verify time.
      return res.status(401).render('courses', {
        courses: [],
        activePage: 'courses',
        user: req.user,
        error: 'Session is missing user id. Please log in again.'
      });
    }

    let result;

    if (req.user.role === 'mentor') {
      // Mentor: courses belonging to tracks mentored by this user
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
        JOIN learning_tracks lt
          ON c.track_id = lt.track_id
        WHERE lt.mentor_id = $1
        ORDER BY lt.track_name, c.order_no;
        `,
        [userId]
      );
    } else {
      // Learner: courses for tracks this learner is enrolled in
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
        JOIN learning_tracks lt
          ON e.track_id = lt.track_id
        JOIN courses c
          ON c.track_id = lt.track_id
        WHERE e.user_id = $1
        ORDER BY lt.track_name, c.order_no;
        `,
        [userId]
      );
    }

    return res.render('courses', {
      courses: result.rows || [],
      activePage: 'courses',
      user: req.user,
      error: ''
    });
  } catch (err) {
    console.error('Error fetching courses:', err);

    // Always pass courses to prevent "courses is not defined" in EJS
    return res.status(500).render('courses', {
      courses: [],
      activePage: 'courses',
      user: req.user,
      error: 'Unable to load courses at the moment.'
    });
  }
});

module.exports = router;