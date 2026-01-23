const express = require('express');
const router = express.Router();
const { getEventsByUser, createEvent, deleteEvent } = require('../models/eventModel');

// Middleware to require auth
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET all events for logged-in user
router.get('/events', requireAuth, async (req, res) => {
  try {
    const events = await getEventsByUser(req.user.userId);
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST create new event
router.post('/events', requireAuth, async (req, res) => {
  try {
    const event = await createEvent({ ...req.body, user_id: req.user.userId });
    res.status(201).json(event);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE an event
router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    await deleteEvent(req.params.id, req.user.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
