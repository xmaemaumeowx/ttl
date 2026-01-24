const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// Middleware: require authentication
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// Courses list
router.get('/', requireAuth, async (req, res) => {
  try {
    // Fetch courses assigned to user (or all if mentor)
    let courses;
    if (req.user.role === 'mentor') {
      const result = await db.query(`
        SELECT * FROM courses
        ORDER BY course_name
      `);
      courses = result.rows;
    } else {
      const result = await db.query(`
        SELECT c.* 
        FROM courses c
        JOIN learner_courses lc ON lc.course_id = c.course_id
        WHERE lc.learner_id = $1
        ORDER BY c.course_name
      `, [req.user.userId]);
      courses = result.rows;
    }

    // Capture success/error messages from query string
    const { success, error } = req.query;

    res.render('courses', {
      user: req.user,
      courses,
      success,
      error,
      pageTitle: "Courses | The Tech Lab",
      activePage: "courses"
    });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.redirect('/dashboard?error=Failed to load courses');
  }
});

// Example: Add course action (mentor only)
router.post('/add', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/courses?error=Unauthorized');

  try {
    const { course_name, description } = req.body;
    await db.query(
      'INSERT INTO courses (course_name, description) VALUES ($1, $2)',
      [course_name, description]
    );
    res.redirect('/courses?success=Course added successfully');
  } catch (err) {
    console.error('Error adding course:', err);
    res.redirect('/courses?error=Failed to add course');
  }
});

// Example: Delete course (mentor only)
router.post('/delete/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/courses?error=Unauthorized');

  try {
    await db.query('DELETE FROM courses WHERE course_id = $1', [req.params.id]);
    res.redirect('/courses?success=Course deleted successfully');
  } catch (err) {
    console.error('Error deleting course:', err);
    res.redirect('/courses?error=Failed to delete course');
  }
});

module.exports = router;
