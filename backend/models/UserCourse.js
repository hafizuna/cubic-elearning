const mongoose = require('mongoose');

const UserCourseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  downloaded: {
    type: Boolean,
    default: false
  },
  completedLessons: [{
    type: Number,  // Lesson order/index
    required: true
  }],
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0  // Percentage of completion
  },
  startingDiscount: {
    type: Number,
    default: 30  // Initial discount percentage
  },
  currentDiscount: {
    type: Number,
    default: 30  // Current discount percentage (decreases with inconsistency)
  },
  missedDays: {
    type: Number,
    default: 0  // Count of days without activity
  },
  lastConsistencyCheck: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to ensure a user can only have one record per course
UserCourseSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('UserCourse', UserCourseSchema);
