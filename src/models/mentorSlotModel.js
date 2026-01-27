const db = require('../db/postgres');

async function getAllSlots() {
  const res = await db.query(`SELECT *, (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.slot_id) AS booked_count
                              FROM mentor_slots s ORDER BY start_time`);
  return res.rows;
}

async function getSlotById(slot_id) {
  const res = await db.query(`SELECT * FROM mentor_slots WHERE slot_id=$1`, [slot_id]);
  return res.rows[0];
}

async function createSlot(mentor_id, start_time, end_time, capacity) {
  const res = await db.query(
    `INSERT INTO mentor_slots (mentor_id, start_time, end_time, capacity)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [mentor_id, start_time, end_time, capacity]
  );
  return res.rows[0];
}

module.exports = { getAllSlots, getSlotById, createSlot };
