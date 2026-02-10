const express = require('express');
const router = express.Router();
const db = require('../db'); 

// GET /reports
router.get('/', async (req, res) => {
  try {
    const learnerId = req.user.id;

    // We fetch the project and joined track name
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

    // Map the results to include your STATIC values
    const reportsWithStaticData = result.rows.map(r => {
      let staticProgress = 0;
      let staticMilestones = 0;

      // Logic to assign static numbers based on the status text
      if (r.status === 'Completed') {
        staticProgress = 100;
        staticMilestones = 1;
      } else if (r.status === 'Ongoing' || r.status === 'In Progress') {
        staticProgress = 50;
        staticMilestones = 0;
      } else {
        staticProgress = 10;
        staticMilestones = 0;
      }

      return {
        // Spread existing database fields (project_id, status, etc.)
        ...r, 
        // Force the track_name if the database returned NULL
        track_name: r.track_name || 'Web Development', 
        // Add our new static fields
        progress: staticProgress,
        milestones: staticMilestones
      };
    });

    res.render('reports', {
      reports: reportsWithStaticData,
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (err) {
    console.error('Error:', err);
    res.render('reports', { reports: [], user: req.user, error: 'Failed to load.' });
  }
});

module.exports = router;