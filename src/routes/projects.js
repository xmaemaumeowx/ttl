const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getProjects, getProjectById, updateProject, deleteProject, createProject } = require('../models/projectModel');

// Middleware: require authentication
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// Projects list
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await getProjects(req.user.userId, req.user.role);

    // Pass query string messages to EJS
    const { success, error } = req.query;

    res.render('projects', {
      user: req.user,
      projects,
      success,
      error
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).send('Server error');
  }
});

// Project detail
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect('/projects?error=Project not found');
    res.render('project-detail', { project });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.redirect('/projects?error=Failed to load project');
  }
});

// Edit project form
router.get('/edit/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect('/projects?error=Project not found');

    const tracks = await db.query('SELECT track_id, track_name FROM learning_tracks ORDER BY track_name');
    res.render('project-edit', { project, tracks: tracks.rows });
  } catch (err) {
    console.error('Error loading edit page:', err);
    res.redirect('/projects?error=Failed to load edit page');
  }
});

// Handle project edit
router.post('/edit/:id', requireAuth, async (req, res) => {
  try {
    await updateProject(req.params.id, req.body);
    res.redirect(`/projects?success=Project updated successfully`);
  } catch (err) {
    console.error('Error updating project:', err);
    res.redirect(`/projects/edit/${req.params.id}?error=Failed to update project`);
  }
});

// Show create project form (mentor only)
router.get('/create', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    const tracks = await db.query('SELECT track_id, track_name FROM learning_tracks ORDER BY track_name');
    const learners = await db.query(`SELECT user_id, full_name FROM users WHERE role='learner' ORDER BY full_name`);
    res.render('project-create', { tracks: tracks.rows, learners: learners.rows });
  } catch (err) {
    console.error('Error loading create project page:', err);
    res.redirect('/projects?error=Failed to load create page');
  }
});

// Handle project creation
router.post('/create', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    const newProject = await createProject(req.body);
    res.redirect(`/projects?success=Project created successfully`);
  } catch (err) {
    console.error('Error creating project:', err);
    res.redirect('/projects/create?error=Failed to create project');
  }
});

// DELETE project (mentor only)
router.post('/delete/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  const projectId = req.params.id;
  try {
    await deleteProject(projectId);
    res.redirect('/projects?success=Project deleted successfully');
  } catch (err) {
    console.error('Error deleting project:', err);
    res.redirect('/projects?error=Failed to delete project');
  }
});

module.exports = router;
