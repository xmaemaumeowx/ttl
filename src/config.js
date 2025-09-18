const mongoose = require('mongoose');

// Define the schema for login data
const LoginSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    }
  },
  {
    collection: 'Credentials' // Specify your collection name here
  }
);

// Create the model
const Login = mongoose.model('Login', LoginSchema);

// Export the model

module.exports = { Login };


