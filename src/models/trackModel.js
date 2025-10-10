const oracledb = require('oracledb');
const db = require('../config/db'); // Import Oracle DB connection

// Function to create a new track in the Oracle DB
const createTrackInDB = async (trackData) => {
  const connection = await oracledb.getConnection();
  const sql = `INSERT INTO learning_tracks (track_name, description, duration_weeks)
               VALUES (:track_name, :description, :duration_weeks) RETURNING track_id INTO :track_id`;
  const result = await connection.execute(sql, {
    track_name: trackData.track_name,
    description: trackData.description,
    duration_weeks: trackData.duration_weeks,
    track_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
  });
  await connection.commit();
  return result.outBinds.track_id[0];
};

// Function to fetch all tracks
const getTracksFromDB = async () => {
  const connection = await oracledb.getConnection();
  const sql = 'SELECT * FROM learning_tracks WHERE is_active = \'Y\'';
  const result = await connection.execute(sql);
  return result.rows;
};

module.exports = { createTrackInDB, getTracksFromDB };
