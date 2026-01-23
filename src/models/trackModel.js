// src/models/trackModel.js
const db = require('../db/postgres'); // Import PostgreSQL pool

// Function to create a new track in PostgreSQL
const createTrackInDB = async (trackData) => {
  const sql = `
    INSERT INTO learning_tracks (track_name, description, duration_weeks, is_active, created_at)
    VALUES ($1, $2, $3, TRUE, NOW())
    RETURNING track_id
  `;
  const values = [
    trackData.track_name,
    trackData.description,
    trackData.duration_weeks
  ];

  try {
    const result = await db.query(sql, values);
    return result.rows[0].track_id;
  } catch (err) {
    console.error('Error inserting track:', err);
    throw err;
  }
};

// Function to fetch all active tracks
const getTracksFromDB = async () => {
  const sql = `
    SELECT track_id, track_name, description, duration_weeks, is_active, created_at
    FROM learning_tracks
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `;

  try {
    const result = await db.query(sql);
    return result.rows;
  } catch (err) {
    console.error('Error fetching tracks:', err);
    throw err;
  }
};

module.exports = { createTrackInDB, getTracksFromDB };
