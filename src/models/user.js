const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
  provider: { type: String, default: 'local' } // 'local' or 'google'
});
module.exports = mongoose.model('User', UserSchema, 'Credentials');