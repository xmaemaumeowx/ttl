const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User exists' });
    const hashed = await bcrypt.hash(password, 10);
    user = new User({ username, password: hashed });
    await user.save();
    res.json({ msg: 'User registered' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login (returns JWT)
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err || !user) return res.status(400).json({ msg: 'Invalid credentials' });
    req.login(user, { session: false }, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    });
  })(req, res, next);
});

// Protected Route
router.get('/profile', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;