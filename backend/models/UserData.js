const mongoose = require('mongoose');

const UserDataSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  previousLogin: {
    type: Date,
    default: null
  },
  loginHistory: [{
    loginTime: {
      type: Date,
      required: true
    },
    logoutTime: {
      type: Date,
      default: null
    },
    sessionDuration: {
      type: Number,  // Duration in minutes
      default: 0
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['login', 'course_completion', 'inactivity', 'achievement', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserData', UserDataSchema);
