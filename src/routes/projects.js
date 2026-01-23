const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const {
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  createProject
} = require('../models/projectModel');

// --------------------
// AUTH MIDDLEWARE
// --------------------
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// --------------------
// LIST PROJECTS
// --------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await getProjects(req.user.userId, req.user.role);

    res.render('projects', {
      pageTitle: 'Projects | The Tech Lab',
      activePage: 'projects',
      user: res.locals.user,
      projects
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.render('projects', {
      user: res.locals.user,
      projects: []
    });
  }
});

// --------------------
// CREATE PROJECT (FORM)
// --------------------
router.get('/create', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    const tracks = await db.query(
      'SELECT track_id, track_name FROM learning_tracks ORDER BY track_name'
    );
    const learners = await db.query(
      "SELECT user_id, full_name FROM users WHERE role='learner' ORDER BY full_name"
    );

    res.render('project-create', {
      user: res.locals.user,
      tracks: tracks.rows,
      learners: learners.rows
    });
  } catch (err) {
    console.error('Error loading create project page:', err);
    res.redirect('/projects');
  }
});

// --------------------
// CREATE PROJECT (POST)
// --------------------
router.post('/create', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    const newProject = await createProject(req.body);
    res.redirect(`/projects/${newProject.project_id}`);
  } catch (err) {
    console.error('Error creating project:', err);
    res.redirect('/projects/create?error=Failed to create project');
  }
});

// --------------------
// EDIT PROJECT (FORM)
// --------------------
router.get('/edit/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect('/projects');

    const tracks = await db.query(
      'SELECT track_id, track_name FROM learning_tracks ORDER BY track_name'
    );

    res.render('project-edit', {
      user: res.locals.user,
      project,
      tracks: tracks.rows
    });
  } catch (err) {
    console.error('Error loading edit page:', err);
    res.redirect('/projects');
  }
});

// --------------------
// EDIT PROJECT (POST)
// --------------------
router.post('/edit/:id', requireAuth, async (req, res) => {
  try {
    await updateProject(req.params.id, req.body);
    res.redirect(`/projects/${req.params.id}`);
  } catch (err) {
    console.error('Error updating project:', err);
    res.redirect(`/projects/edit/${req.params.id}?error=Failed to update`);
  }
});

// --------------------
// DELETE PROJECT
// --------------------
router.post('/delete/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'mentor') return res.redirect('/projects');

  try {
    await deleteProject(req.params.id);
    res.redirect('/projects?success=Project deleted successfully');
  } catch (err) {
    console.error('Error deleting project:', err);
    res.redirect('/projects?error=Failed to delete project');
  }
});

// --------------------
// PROJECT DETAIL (LAST)
// --------------------
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.redirect('/projects');

    res.render('project-detail', {
      user: res.locals.user,
      project
    });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.redirect('/projects');
  }
});

const checkProjectOwnership = require('../middleware/checkProjectOwnership');

router.get('/edit/:id', requireAuth, checkProjectOwnership, async (req, res) => {
  const tracks = await db.query('SELECT track_id, track_name FROM learning_tracks ORDER BY track_name');
  res.render('project-edit', { project: req.project, tracks: tracks.rows });
});

router.post('/edit/:id', requireAuth, checkProjectOwnership, async (req, res) => {
  await updateProject(req.params.id, req.body);
  res.redirect(`/projects/${req.params.id}`);
});


module.exports = router;
