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
  lessonDetails: [{
    lessonNumber: {
      type: Number,
      required: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0
    },
    attempts: {
      type: Number,
      default: 1
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', 'unknown'],
      default: 'unknown'
    },
    notes: [{
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    revisits: {
      type: Number,
      default: 0
    },
    lastRevisited: {
      type: Date,
      default: null
    }
  }],
  quizResults: [{
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    lessonNumber: {
      type: Number,
      required: true
    },
    score: {
      type: Number, // percentage
      default: 0
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    incorrectAnswers: {
      type: Number,
      default: 0
    },
    skippedQuestions: {
      type: Number,
      default: 0
    }
  }],
  assignments: [{
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment'
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'graded'],
      default: 'not_started'
    },
    startedAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    grade: {
      type: Number,
      default: null
    },
    feedback: String,
    timeSpent: {
      type: Number, // in minutes
      default: 0
    }
  }],
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0  // Percentage of completion
  },
  certificateEarned: {
    type: Boolean,
    default: false
  },
  certificateIssuedAt: {
    type: Date,
    default: null
  },
  favorited: {
    type: Boolean,
    default: false
  },
  rating: {
    score: {
      type: Number, // 1-5
      default: null
    },
    review: String,
    createdAt: {
      type: Date,
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  },
  studySchedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String, // HH:MM format
    endTime: String, // HH:MM format
    reminderEnabled: {
      type: Boolean,
      default: true
    }
  }],
  learningGoals: {
    targetCompletionDate: {
      type: Date,
      default: null
    },
    weeklyHoursGoal: {
      type: Number,
      default: 5
    },
    personalNotes: String
  },
  difficultyRating: {
    type: String,
    enum: ['too_easy', 'just_right', 'challenging', 'too_difficult', 'not_rated'],
    default: 'not_rated'
  },
  pacePreference: {
    type: String,
    enum: ['accelerated', 'standard', 'relaxed', 'not_set'],
    default: 'not_set'
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
