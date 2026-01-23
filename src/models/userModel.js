// src/models/userModel.js
const db = require('../db/postgres'); // Import PostgreSQL pool

// ✅ Find a user by email
async function findUserByEmail(email) {
  const sql = `SELECT user_id, full_name, email, password_hash, role, avatar, created_at
               FROM users
               WHERE email = $1`;
  try {
    const result = await db.query(sql, [email]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error finding user by email:', err);
    throw err;
  }
}

// ✅ Create a new user
async function createUser(full_name, email, password_hash, role = 'learner') {
  const sql = `
    INSERT INTO users (full_name, email, password_hash, role, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING user_id
  `;
  const values = [full_name, email, password_hash, role];

  try {
    const result = await db.query(sql, values);
    return result.rows[0].user_id;
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
}

module.exports = {
  findUserByEmail,
  createUser,
};
