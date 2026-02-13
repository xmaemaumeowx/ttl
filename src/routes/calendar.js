// routes/calendar.js
const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

// Middleware
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET calendar page
router.get("/", requireAuth, (req, res) => {
  res.locals.pageTitle = "Calendar | The Tech Lab";
  res.locals.activePage = "calendar";
  res.render("calendar", { user: res.locals.user });
});

// GET all slots (JSON)
router.get("/slots", requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.slot_id, s.mentor_id, s.start_time, s.end_time, s.capacity,
             u.full_name AS mentor_name,
             COALESCE(b.booked_count, 0) AS booked_count
      FROM mentor_slots s
      LEFT JOIN (
        SELECT slot_id, COUNT(*) AS booked_count
        FROM bookings
        GROUP BY slot_id
      ) b ON s.slot_id = b.slot_id
      LEFT JOIN users u ON s.mentor_id = u.user_id
      ORDER BY s.start_time
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

// CREATE slot (mentor)
router.post("/slots", requireAuth, async (req, res) => {
  if (req.user.role !== "mentor") return res.status(403).json({ error: "Unauthorized" });

  const { start_time, end_time, capacity } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO mentor_slots (mentor_id, start_time, end_time, capacity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.userId, start_time, end_time, capacity || 1]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create slot" });
  }
});

// BOOK slot (learner)
router.post("/slots/:id/book", requireAuth, async (req, res) => {
  if (req.user.role !== "learner") return res.status(403).json({ error: "Only learners can book slots" });

  const slotId = req.params.id;
  const studentId = req.user.userId;

  try {
    const exists = await db.query(
      `SELECT * FROM bookings WHERE slot_id=$1 AND student_id=$2`,
      [slotId, studentId]
    );
    if (exists.rows.length > 0) return res.status(400).json({ error: "Already booked" });

    const slot = await db.query(
      `SELECT capacity FROM mentor_slots WHERE slot_id=$1`,
      [slotId]
    );
    const capacity = slot.rows[0].capacity;

    const bookedCountResult = await db.query(
      `SELECT COUNT(*) FROM bookings WHERE slot_id=$1`,
      [slotId]
    );
    const bookedCount = parseInt(bookedCountResult.rows[0].count, 10);

    const status = bookedCount < capacity ? "confirmed" : "waitlist";

    const booking = await db.query(
      `INSERT INTO bookings (slot_id, student_id, status) VALUES ($1, $2, $3) RETURNING *`,
      [slotId, studentId, status]
    );

    res.json(booking.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to book slot" });
  }
});

module.exports = router;
