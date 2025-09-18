// Load environment variables
require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const session = require('express-session');

// Import User model (adjust path if needed)
const User = require('./models/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Google OAuth client
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Page routes
app.get('/', (req, res) => res.render('login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));
app.get('/home', (req, res) => {
  const user = req.session.user || null; // not rendered but available if needed
  res.render('home');
});

// Signup handler
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required', type: 'error' });
  }
  // Validate format and strength
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\{}\[\]|\\:;"'<>,.?/]).{8,}$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Invalid email format!', type: 'error' });
  }
  if (!strongPasswordPattern.test(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long, include uppercase, lowercase, number, and special character!',
      type: 'error'
    });
  }
  try {
    const existingUser = await User.findOne({ username: email, provider: 'local' });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use', type: 'error' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: email, password: hashedPassword, provider: 'local' });
    await newUser.save();
    res.json({ message: 'User successfully added. Please log in.', type: 'success' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', type: 'error' });
  }
});

// Login handler
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required', type: 'error' });
  }
  try {
    const user = await User.findOne({ username: email, provider: 'local' });
    if (!user) {
      return res.status(400).json({ message: 'User not found', type: 'error' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials', type: 'error' });
    }
    req.session.user = { email };
    return res.json({ message: 'Login successful!', type: 'success' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error', type: 'error' });
  }
});

// Get current user
app.get('/current-user', (req, res) => {
  res.json({ user: req.session.user || null });
});

// Logout handler
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Google OAuth handler
app.post('/api/auth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ message: 'No ID token provided.', type: 'error' });
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    let user = await User.findOne({ username: email, provider: 'google' });
    if (!user) {
      user = new User({ username: email, provider: 'google' });
      await user.save();
    }
    req.session.user = { email };
    res.json({ message: 'Login successful!', type: 'success' });
  } catch (err) {
    console.error('Google Auth error:', err);
    res.status(401).json({ message: 'Google authentication failed.', type: 'error' });
  }
});