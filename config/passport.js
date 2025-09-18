const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        if (!user) return done(null, false, { message: 'Incorrect user' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: 'Incorrect password' });
        return done(null, user);
      } catch (err) { return done(err); }
    })
  );

  // JWT Strategy
  passport.use(
    new JWTStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    }, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id);
        return user ? done(null, user) : done(null, false);
      } catch (err) { return done(err, false); }
    })
  );

  // Serialize/Deserialize (required for sessions)
  passport.serializeUser((user, done) => { done(null, user.id); });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) { done(err, null);}
  });
};