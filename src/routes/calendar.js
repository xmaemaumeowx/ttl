const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth'); // must be a function

const mentorSlotModel = require('../models/mentorSlotModel');
const bookingModel = require('../models/bookingModel');

// Mentor creates slot
router.post('/slots', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'mentor') return res.status(403).send('Forbidden');
    const { start_time, end_time, capacity } = req.body;
    const slot = await mentorSlotModel.createSlot(req.user.user_id, start_time, end_time, capacity);
    res.json(slot);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Student books slot
router.post('/slots/:id/book', requireAuth, async (req, res) => {
  try {
    const slot_id = req.params.id;
    const slot = await mentorSlotModel.getSlotById(slot_id);
    if (!slot) return res.status(404).send('Slot not found');

    const booking = await bookingModel.bookSlot(slot_id, req.user.user_id, slot.capacity);
    res.json(booking);
  } catch (err) {
    if (err.code === '23505') return res.status(400).send('Already booked this slot');
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Cancel booking
router.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking_id = req.params.id;
    const result = await bookingModel.cancelBooking(booking_id);
    if (!result) return res.status(404).send('Booking not found');
    res.json({ message: 'Booking canceled', promoted: result.promoted });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
