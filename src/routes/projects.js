const express = require('express');
const router = express.Router();
const { getProjects, getProjectById, createProject, updateProject, deleteProject } = require('../models/projectModel');
const db = require('../db/postgres');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// List projects
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await getProjects(req.user.userId, req.user.role);
    res.render('projects', { user: req.user, projects, success: req.query.success, error: req.query.error });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).send('Server error');
  }
});

// Project details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect('/projects');
    res.render('project-detail', { project });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).send('Server error');
  }
});

// Edit form
router.get('/edit/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect('/projects');
    const tracks = await db.query('SELECT track_id, track_name FROM learning_tracks ORDER BY track_name');
    res.render('project-edit', { project, tracks: tracks.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/projects?error=Failed to load edit page');
  }
});

// Handle edit
router.post('/edit/:id', requireAuth, async (req, res) => {
  try {
    await updateProject(req.params.id, req.body, req.user);
    res.redirect(`/projects/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/projects/edit/${req.params.id}?error=Failed to update`);
  }
});

// Create project (mentor only)
router.get('/create', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    const tracks = await db.query('SELECT track_id, track_name FROM learning_tracks ORDER BY track_name');
    const learners = await db.query(`SELECT user_id, full_name FROM users WHERE role='learner' ORDER BY full_name`);
    res.render('project-create', { tracks: tracks.rows, learners: learners.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/projects?error=Failed to load create page');
  }
});

// Handle create
router.post('/create', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    const newProject = await createProject(req.body);
    res.redirect(`/projects/${newProject.project_id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/projects/create?error=Failed to create project');
  }
});

// Delete project (mentor only)
router.post('/delete/:id', requireAuth, async (req, res) => {
  try {
    await deleteProject(req.params.id, req.user);
    res.redirect('/projects?success=Project deleted successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/projects?error=Failed to delete project');
  }
});

module.exports = router;
