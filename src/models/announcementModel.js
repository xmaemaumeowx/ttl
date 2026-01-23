const db = require('../db/postgres');

// Fetch all active announcements
async function getAnnouncements() {
  const sql = `
    SELECT announcement_id, title, message, created_at
    FROM announcements
    WHERE expires_at IS NULL OR expires_at > NOW()
    ORDER BY created_at DESC
  `;
  const result = await db.query(sql);
  return result.rows;
}

// Add a new announcement
async function addAnnouncement(title, message, expiresAt = null) {
  const sql = `
    INSERT INTO announcements (title, message, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(sql, [title, message, expiresAt]);
  return result.rows[0];
}

module.exports = { getAnnouncements, addAnnouncement };
