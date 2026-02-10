const express = require('express');
const router = express.Router();
const db = require('../db'); // your PostgreSQL client

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
        lt.track_name,
        -- Generate progress based on status text
        CASE 
          WHEN p.status = 'Completed' THEN 100
          WHEN p.status = 'In Progress' THEN 50
          WHEN p.status = 'Ongoing' THEN 50
          ELSE 10
        END AS progress,
        -- Generate a milestone count (e.g., 1 for finished, 0 for not)
        CASE 
          WHEN p.status = 'Completed' THEN 1
          ELSE 0
        END AS milestones
      FROM projects p
      LEFT JOIN learning_tracks lt ON lt.track_id = p.track_id
      WHERE p.learner_id = $1
      ORDER BY p.start_date ASC
    `, [learnerId]);

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
