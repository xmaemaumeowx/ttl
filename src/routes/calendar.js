// src/routes/calendar.js
const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth'); // must be a proper function
const mentorSlotModel = require('../models/mentorSlotModel');
const bookingModel = require('../models/bookingModel');

/* ========================================
   GET /calendar/slots
   Fetch all mentor slots for FullCalendar
======================================== */
router.get('/slots', requireAuth, async (req, res) => {
  try {
    const slots = await mentorSlotModel.getAllSlots();
    // Format for FullCalendar
    const events = slots.map(slot => ({
      id: slot.slot_id,
      title: `Mentor Slot (${slot.capacity} seats)`,
      start: slot.start_time,
      end: slot.end_time,
      extendedProps: {
        capacity: slot.capacity,
        booked: slot.booked_count || 0
      }
    }));
    res.json(events);
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).send('Server error');
  }
});

/* ========================================
   POST /calendar/slots
   Mentor creates a new slot
======================================== */
router.post('/slots', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'mentor') {
      return res.status(403).send('Forbidden');
    }

    const { start_time, end_time, capacity } = req.body;
    if (!start_time || !end_time) {
      return res.status(400).send('Missing start_time or end_time');
    }

    const slot = await mentorSlotModel.createSlot(
      req.user.userId,
      start_time,
      end_time,
      capacity || 1
    );

    res.json({
      id: slot.slot_id,
      title: `Mentor Slot (${slot.capacity} seats)`,
      start: slot.start_time,
      end: slot.end_time,
      extendedProps: {
        capacity: slot.capacity,
        booked: 0
      }
    });
  } catch (err) {
    console.error('Error creating slot:', err);
    res.status(500).send('Server error');
  }
});

/* ========================================
   POST /calendar/slots/:id/book
   Student books a slot
======================================== */
router.post('/slots/:id/book', requireAuth, async (req, res) => {
  try {
    const slot_id = req.params.id;
    const slot = await mentorSlotModel.getSlotById(slot_id);

    if (!slot) return res.status(404).send('Slot not found');

    const booking = await bookingModel.bookSlot(slot_id, req.user.userId, slot.capacity);

    res.json({
      message: 'Booked successfully',
      booking_id: booking.booking_id,
      slot_id: slot_id
    });
  } catch (err) {
    if (err.code === '23505') return res.status(400).send('Already booked this slot');
    console.error('Error booking slot:', err);
    res.status(500).send('Server error');
  }
});

/* ========================================
   POST /calendar/bookings/:id/cancel
   Student cancels a booking
======================================== */
router.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking_id = req.params.id;

    const result = await bookingModel.cancelBooking(booking_id);

    if (!result) return res.status(404).send('Booking not found');

    res.json({
      message: 'Booking canceled successfully',
      promoted: result.promoted || []
    });
  } catch (err) {
    console.error('Error canceling booking:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
