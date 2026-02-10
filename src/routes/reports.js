const express = require('express');
const router = express.Router();
const db = require('../db'); // your PostgreSQL client

// GET /reports
router.get('/', async (req, res) => {
  try {
    const learnerId = req.user.id; // or however you get the logged-in learner

    const result = await db.query(`
      SELECT 
        p.project_id,
        p.name AS project_name,
        p.status,
        p.start_date,
        p.end_date,
        lt.track_name
      FROM projects p
      LEFT JOIN learning_tracks lt ON lt.track_id = p.track_id
      WHERE p.learner_id = $1
      ORDER BY p.start_date ASC
    `, [learnerId]);

    console.log('Reports fetched:', result.rows); // debug: should log 4 rows

    res.render('reports', {
      reports: result.rows, // matches EJS template
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (err) {
    console.error('Error fetching reports:', err);
    res.render('reports', {
      reports: [],
      user: req.user,
      error: 'Failed to load your reports. Please try again later.'
    });
  }
});

module.exports = router;
