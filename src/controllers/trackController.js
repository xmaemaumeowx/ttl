const { createTrackInDB, getTracksFromDB } = require('../models/trackModel');

// Controller to create a new track
const createTrack = async (req, res) => {
  try {
    const trackData = req.body; // e.g. { track_name, description, duration_weeks }
    const trackId = await createTrackInDB(trackData);
    res.status(201).json({ message: 'Track created successfully', trackId });
  } catch (err) {
    console.error('Error creating track:', err);
    res.status(500).json({ message: 'Server error', type: 'error' });
  }
};

// Controller to fetch all tracks
const getAllTracks = async (req, res) => {
  try {
    const tracks = await getTracksFromDB();
    res.status(200).json(tracks);
  } catch (err) {
    console.error('Error fetching tracks:', err);
    res.status(500).json({ message: 'Server error', type: 'error' });
  }
};

module.exports = { createTrack, getAllTracks };
