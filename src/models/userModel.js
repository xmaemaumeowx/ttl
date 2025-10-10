const { getConnection } = require("../config/db");

// ✅ Find a user by email
async function findUserByEmail(email) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM USERS WHERE EMAIL = :email`,
      [email]
    );
    return result.rows[0] || null;
  } finally {
    await conn.close();
  }
}

// ✅ Create a new user
async function createUser(full_name, email, password_hash, role) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO USERS (FULL_NAME, EMAIL, PASSWORD_HASH, ROLE)
       VALUES (:full_name, :email, :password_hash, :role)`,
      { full_name, email, password_hash, role },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

module.exports = {
  findUserByEmail,
  createUser,
};
