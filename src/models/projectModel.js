const db = require('../db/postgres');

// --------------------
// GET PROJECTS
// --------------------
async function getProjects(userId, role) {
  let sql, params = [];

  if (role === 'mentor') {
    // Mentors can see all projects
    sql = `
      SELECT p.*, 
             u.full_name AS owner_name,
             lt.track_name
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      ORDER BY p.created_at DESC
    `;
  } else {
    // Learners see only their own projects
    sql = `
      SELECT p.*, lt.track_name
      FROM projects p
      LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    params = [userId];
  }

  const result = await db.query(sql, params);
  return result.rows;
}

// --------------------
// GET PROJECT BY ID
// --------------------
async function getProjects(userId, role) {
  if (role === 'mentor') {
    // Fetch projects assigned to this mentor via mentor_project table
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
    // Fetch projects for the learner
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


// --------------------
// CREATE PROJECT
// --------------------
async function createProject(data, userId) {
  const sql = `
    INSERT INTO projects
      (name, description, start_date, end_date, technology_stack,
       status, track_id, github_link, live_link, user_id)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
    userId
  ];

  const result = await db.query(sql, values);
  return result.rows[0];
}

// --------------------
// UPDATE PROJECT
// --------------------
async function updateProject(projectId, data) {
  const sql = `
    UPDATE projects
    SET name=$1,
        description=$2,
        start_date=$3,
        end_date=$4,
        technology_stack=$5,
        status=$6,
        track_id=$7,
        github_link=$8,
        live_link=$9,
        updated_at=NOW()
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

// --------------------
// DELETE PROJECT
// --------------------
async function deleteProject(projectId) {
  await db.query(
    'DELETE FROM projects WHERE project_id = $1',
    [projectId]
  );
}

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
