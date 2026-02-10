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
        lt.track_name
      FROM projects p
      LEFT JOIN learning_tracks lt ON lt.track_id = p.track_id
      WHERE p.learner_id = $1
      ORDER BY p.project_id ASC
    `, [learnerId]);

    // Manually map static values based on the status string
    const staticReports = result.rows.map(r => {
      let progress = 0;
      let milestones = 0;

      // Match the status from your database (case-sensitive)
      if (r.status === 'Completed') {
        progress = 100;
        milestones = 5;
      } else if (r.status === 'Ongoing' || r.status === 'In Progress') {
        progress = 65; // Static value for all active projects
        milestones = 2;
      } else if (r.status === 'Planned') {
        progress = 0;
        milestones = 0;
      }

      return {
        ...r,
        track_name: r.track_name || 'General Track', // Fallback if NULL
        progress: progress,
        milestones: milestones
      };
    });

    res.render('reports', {
      reports: staticReports,
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (err) {
    console.error('Error fetching reports:', err);
    res.render('reports', { reports: [], user: req.user, error: 'Database error.' });
  }
});

module.exports = router;