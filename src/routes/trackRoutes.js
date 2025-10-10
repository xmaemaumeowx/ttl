const express = require('express');
const { createTrack, getAllTracks } = require('../controllers/trackController');
const router = express.Router();

// Route to create a new track
router.post('/', createTrack);

// Route to get all tracks
router.get('/', getAllTracks);

module.exports = router;
