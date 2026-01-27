const express = require("express");
const router = express.Router();
const db = require("../db/postgres");
const { requireAuth } = require("./auth");

// ---- GET all mentor slots ----
router.get("/slots", requireAuth, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM mentor_slots ORDER BY start_time`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

// ---- CREATE a mentor slot (mentor only) ----
router.post("/slots", requireAuth, async (req, res) => {
  if (req.user.role !== "mentor") return res.status(403).send("Only mentors can create slots");

  const { start_time, end_time } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO mentor_slots (mentor_id, start_time, end_time) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.userId, start_time, end_time]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create slot" });
  }
});

// ---- BOOK a slot (learner) ----
router.post("/slots/:id/book", requireAuth, async (req, res) => {
  const slotId = req.params.id;
  try {
    const result = await db.query(
      `INSERT INTO bookings (slot_id, learner_id) VALUES ($1, $2) RETURNING *`,
      [slotId, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to book slot" });
  }
});

// ---- CANCEL booking ----
router.delete("/slots/:id/book", requireAuth, async (req, res) => {
  const slotId = req.params.id;
  try {
    await db.query(
      `DELETE FROM bookings WHERE slot_id=$1 AND learner_id=$2`,
      [slotId, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

module.exports = router;
