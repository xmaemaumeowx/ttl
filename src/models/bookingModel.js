const db = require('../db/postgres');

async function bookSlot(slot_id, user_id, capacity) {
  // check current bookings
  const countRes = await db.query(`SELECT COUNT(*) FROM bookings WHERE slot_id=$1`, [slot_id]);
  const count = parseInt(countRes.rows[0].count, 10);

  if (count >= capacity) {
    // handle waitlist
    const res = await db.query(`INSERT INTO bookings (slot_id, user_id, status) VALUES ($1,$2,'waitlist') RETURNING *`, [slot_id, user_id]);
    return res.rows[0];
  }

  const res = await db.query(`INSERT INTO bookings (slot_id, user_id, status) VALUES ($1,$2,'booked') RETURNING *`, [slot_id, user_id]);
  return res.rows[0];
}

async function cancelBooking(booking_id) {
  // delete booking
  const res = await db.query(`DELETE FROM bookings WHERE booking_id=$1 RETURNING *`, [booking_id]);
  // promote from waitlist (if any)
  const waitlist = await db.query(`UPDATE bookings SET status='booked' WHERE slot_id=$1 AND status='waitlist' ORDER BY created_at LIMIT 1 RETURNING *`, [res.rows[0].slot_id]);
  return { promoted: waitlist.rows };
}

module.exports = { bookSlot, cancelBooking };
