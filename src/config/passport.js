// src/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // Extract email and full name
      const email = profile.emails?.[0]?.value || null;
      const full_name = profile.displayName || null;

      // Attach to profile
      profile.user_email = email;
      profile.user_name = full_name;

      return done(null, profile);
    }
  )
);

module.exports = passport;
