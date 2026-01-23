const db = require('../db/postgres');

// Fetch all events for a user
async function getEventsByUser(userId) {
  const result = await db.query(
    'SELECT event_id, title, start, "end", all_day FROM events WHERE user_id = $1 ORDER BY start',
    [userId]
  );
  return result.rows;
}

// Create a new event
async function createEvent({ title, start, end, all_day, user_id }) {
  const result = await db.query(
    `INSERT INTO events (title, start, "end", all_day, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, start, end || null, all_day, user_id]
  );
  return result.rows[0];
}

// Delete an event by ID
async function deleteEvent(eventId, userId) {
  await db.query('DELETE FROM events WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
}

module.exports = { getEventsByUser, createEvent, deleteEvent };
