// middleware/checkProjectOwnership.js
const { getProjectById } = require('../models/projectModel');

async function checkProjectOwnership(req, res, next) {
  const projectId = req.params.id;
  const project = await getProjectById(projectId);

  if (!project) return res.redirect('/projects');

  // If learner, check ownership
  if (req.user.role === 'learner' && project.user_id !== req.user.userId) {
    return res.status(403).send("Access denied: You can only edit your own projects");
  }

  // Pass project to next middleware
  req.project = project;
  next();
}

module.exports = checkProjectOwnership;
