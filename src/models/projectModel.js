const db = require('../db/postgres');

// Get all projects for a user
async function getProjects(userId, role) {
  if (role === 'mentor') {
    // Projects assigned to this mentor via mentor_project
    const sql = `
      SELECT p.*, u.full_name AS learner_name, lt.track_name
      FROM projects p
      JOIN mentor_project mp ON p.project_id = mp.project_id
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      WHERE mp.mentor_id = $1
      ORDER BY p.start_date DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  } else {
    // Projects belonging to this learner
    const sql = `
      SELECT p.*, lt.track_name
      FROM projects p
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      WHERE p.user_id = $1
      ORDER BY p.start_date DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  }
}

// Get single project by ID (all roles, for details)
async function getProjectById(projectId) {
  const sql = `
    SELECT p.*, u.full_name AS learner_name, lt.track_name
    FROM projects p
    LEFT JOIN users u ON p.user_id = u.user_id
    LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
    WHERE p.project_id = $1
  `;
  const result = await db.query(sql, [projectId]);
  return result.rows[0];
}

// Create new project
async function createProject(data) {
  const sql = `
    INSERT INTO projects (name, description, start_date, end_date, technology_stack, status, track_id, github_link, live_link, user_id)
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
    data.user_id || null // learner assignment
  ];
  const result = await db.query(sql, values);
  return result.rows[0];
}

// Update project
async function updateProject(projectId, data, user) {
  // Only allow update if mentor or owner
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');

  if (user.role !== 'mentor' && project.user_id !== user.userId) {
    throw new Error('Unauthorized to edit this project');
  }

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

// Delete project
async function deleteProject(projectId, user) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');

  // Only mentor assigned to project can delete
  if (user.role !== 'mentor') throw new Error('Unauthorized to delete this project');

  const sql = `DELETE FROM projects WHERE project_id = $1`;
  await db.query(sql, [projectId]);
}

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
