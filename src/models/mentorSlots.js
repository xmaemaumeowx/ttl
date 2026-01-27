const db = require('../db/db');

// Create a mentor slot
async function createSlot(mentor_id, start_time, end_time, capacity = 1) {
  const result = await db.query(
    `INSERT INTO mentor_slots (mentor_id, start_time, end_time, capacity)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [mentor_id, start_time, end_time, capacity]
  );
  return result.rows[0];
}

// Get all slots with mentor info and booking count
async function getAllSlots() {
  const result = await db.query(
    `SELECT ms.*, u.full_name as mentor_name,
     (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = ms.slot_id AND b.status='confirmed') AS booked_count
     FROM mentor_slots ms
     JOIN users u ON ms.mentor_id = u.user_id
     ORDER BY ms.start_time ASC`
  );
  return result.rows;
}

// Get single slot by ID
async function getSlotById(slot_id) {
  const result = await db.query(
    `SELECT * FROM mentor_slots WHERE slot_id=$1`,
    [slot_id]
  );
  return result.rows[0];
}

module.exports = {
  createSlot,
  getAllSlots,
  getSlotById
};
