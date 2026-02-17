// src/routes/courses.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/* ===============================
   GET COURSES PAGE
   Mounted at: /courses
================================ */
router.get('/', requireAuth, async (req, res) => {
  try {
    // loadUserFromDB already populated res.locals.user
    const currentUser = res.locals.user;

    if (!currentUser?.userId) {
      return res.redirect('/login');
    }

    let result;

    if (currentUser.role === 'mentor') {
      // Mentor: courses under tracks they handle
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
        [currentUser.userId]
      );
    } else {
      // Learner: courses from enrolled tracks
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
        [currentUser.userId]
      );
    }

    res.locals.pageTitle = "Courses | The Tech Lab";
    res.locals.activePage = "courses";

    return res.render('courses', {
      courses: result.rows || [],
      error: ''
    });

  } catch (err) {
    console.error('Error fetching courses:', err);

    return res.status(500).render('courses', {
      courses: [],
      error: 'Unable to load courses at the moment.'
    });
  }
});

module.exports = router;
