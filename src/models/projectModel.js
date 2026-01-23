const db = require('../db/postgres');

// Get all projects for a user
async function getProjects(userId, role) {
  if (role === 'mentor') {
    // Fetch projects assigned to mentor's learners
    const sql = `
      SELECT p.*, u.full_name AS learner_name, lt.track_name
      FROM projects p
      JOIN users u ON p.learner_id = u.user_id
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      WHERE u.user_id IN (
        SELECT user_id FROM mentor_learner WHERE mentor_id = $1
      )
      ORDER BY p.start_date DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  } else {
    // Fetch projects for the learner
    const sql = `
      SELECT p.*, lt.track_name
      FROM projects p
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      WHERE p.learner_id = $1
      ORDER BY p.start_date DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  }
}

// Get a single project by ID
async function getProjectById(projectId) {
  const sql = `
    SELECT p.*, u.full_name AS learner_name, lt.track_name
    FROM projects p
    LEFT JOIN users u ON p.learner_id = u.user_id
    LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
    WHERE p.project_id = $1
  `;
  const result = await db.query(sql, [projectId]);
  return result.rows[0];
}

// Create a new project
async function createProject(data) {
  const sql = `
    INSERT INTO projects (name, description, start_date, end_date, technology_stack, status, track_id, github_link, live_link, learner_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `;
  const values = [
    data.name,
    data.description,
    data.start_date || null,
    data.end_date || null,
    data.technology_stack || null,
    data.status || 'Planned',
    data.track_id || null,
    data.github_link || null,
    data.live_link || null,
    data.learner_id || null
  ];
  const result = await db.query(sql, values);
  return result.rows[0];
}

// Update project
async function updateProject(projectId, data) {
  const sql = `
    UPDATE projects
    SET name=$1, description=$2, start_date=$3, end_date=$4, technology_stack=$5,
        status=$6, track_id=$7, github_link=$8, live_link=$9, updated_at=NOW()
    WHERE project_id=$10
    RETURNING *
  `;
  const values = [
    data.name,
    data.description,
    data.start_date || null,
    data.end_date || null,
    data.technology_stack || null,
    data.status || 'Planned',
    data.track_id || null,
    data.github_link || null,
    data.live_link || null,
    projectId
  ];
  const result = await db.query(sql, values);
  return result.rows[0];
}

// Delete a project by ID
async function deleteProject(projectId) {
  const sql = `DELETE FROM projects WHERE project_id = $1`;
  await db.query(sql, [projectId]);
}

module.exports = { getProjects, getProjectById, updateProject, createProject, deleteProject };

