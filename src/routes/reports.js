const express = require('express');
const router = express.Router();
const db = require('../db'); 

// GET /reports
router.get('/', async (req, res) => {
  try {
    const learnerId = req.user.id;

    const result = await db.query(`
      SELECT 
        p.project_id,
        p.name AS project_name,
        p.status,
        p.start_date,
        p.end_date,
        lt.track_name AS track_name,
        -- Force output as Integer to ensure EJS comparisons work
        CASE 
          WHEN p.status = 'Completed' THEN 100
          WHEN p.status = 'In Progress' THEN 50
          WHEN p.status = 'Ongoing' THEN 50
          ELSE 10
        END::INT AS progress,
        CASE 
          WHEN p.status = 'Completed' THEN 1
          ELSE 0
        END::INT AS milestones
      FROM projects p
      LEFT JOIN learning_tracks lt ON lt.track_id = p.track_id
      WHERE p.learner_id = $1
      ORDER BY p.start_date ASC
    `, [learnerId]);

    // This log will confirm the data structure in your terminal
    console.log('Data sent to UI:', result.rows[0]); 

    res.render('reports', {
      reports: result.rows,
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (err) {
    console.error('Error fetching reports:', err);
    res.render('reports', {
      reports: [],
      user: req.user,
      error: 'Failed to load your reports.'
    });
  }
});

module.exports = router;