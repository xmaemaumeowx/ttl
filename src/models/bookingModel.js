const db = require('../db/db');

// Book a slot (auto-waitlist if full)
async function bookSlot(slot_id, student_id, capacity) {
  // Count confirmed bookings
  const countResult = await db.query(
    `SELECT COUNT(*) FROM bookings WHERE slot_id=$1 AND status='confirmed'`,
    [slot_id]
  );
  const confirmedCount = parseInt(countResult.rows[0].count);

  const status = confirmedCount < capacity ? 'confirmed' : 'waitlist';

  const result = await db.query(
    `INSERT INTO bookings (slot_id, student_id, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [slot_id, student_id, status]
  );
  return result.rows[0];
}

// Cancel booking
async function cancelBooking(booking_id) {
  // Get booking info
  const bookingResult = await db.query(
    `SELECT * FROM bookings WHERE booking_id=$1`,
    [booking_id]
  );
  const booking = bookingResult.rows[0];
  if (!booking) return null;

  // Delete booking
  await db.query(`DELETE FROM bookings WHERE booking_id=$1`, [booking_id]);

  // Promote first waitlist student if exists
  const waitlist = await db.query(
    `SELECT * FROM bookings WHERE slot_id=$1 AND status='waitlist' ORDER BY created_at ASC LIMIT 1`,
    [booking.slot_id]
  );

  if (waitlist.rows[0]) {
    await db.query(
      `UPDATE bookings SET status='confirmed' WHERE booking_id=$1`,
      [waitlist.rows[0].booking_id]
    );
    return { promoted: waitlist.rows[0] };
  }

  return { promoted: null };
}

// Get bookings for a slot
async function getBookingsBySlot(slot_id) {
  const result = await db.query(
    `SELECT b.*, u.full_name as student_name
     FROM bookings b
     JOIN users u ON b.student_id = u.user_id
     WHERE b.slot_id=$1
     ORDER BY b.created_at ASC`,
    [slot_id]
  );
  return result.rows;
}

module.exports = {
  bookSlot,
  cancelBooking,
  getBookingsBySlot
};
