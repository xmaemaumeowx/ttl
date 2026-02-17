// src/routes/reports.js

const express = require('express');
const router = express.Router();
const db = require('../db');

/* ==========================================
   GET REPORTS PAGE
   Mounted at: /reports
========================================== */
router.get('/', async (req, res) => {
  try {
    const currentUser = res.locals.user;

    if (!currentUser?.userId) {
      return res.redirect('/login');
    }

    let result;

    if (currentUser.role === 'mentor') {
      // Mentor report: learners + projects under mentor
      result = await db.query(
        `
        SELECT 
          u.user_id,
          u.full_name,
          COUNT(p.project_id) AS total_projects,
          COUNT(CASE WHEN p.status = 'Completed' THEN 1 END) AS completed_projects
        FROM users u
        LEFT JOIN projects p 
          ON u.user_id = p.learner_id
        WHERE u.role = 'learner'
          AND p.mentor_id = $1
        GROUP BY u.user_id, u.full_name
        ORDER BY u.full_name;
        `,
        [currentUser.userId]
      );
    } else {
      // Learner report: personal project stats
      result = await db.query(
        `
        SELECT 
          COUNT(project_id) AS total_projects,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS completed_projects
        FROM projects
        WHERE learner_id = $1;
        `,
        [currentUser.userId]
      );
    }

    res.locals.pageTitle = "Reports | The Tech Lab";
    res.locals.activePage = "reports";

    return res.render('mentor-report', {
      reports: result.rows || [],
      error: ''
    });

  } catch (err) {
    console.error('Error loading reports:', err);

    return res.status(500).render('mentor-report', {
      reports: [],
      error: 'Unable to load reports at the moment.'
    });
  }
});

module.exports = router;
