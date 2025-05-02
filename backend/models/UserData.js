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
    },
    device: {
      type: String,
      default: 'Unknown'
    },
    browser: {
      type: String,
      default: 'Unknown'
    },
    platform: {
      type: String,
      default: 'Unknown'
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    location: {
      country: String,
      city: String
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    successful: {
      type: Boolean,
      default: true
    }
  }],
  pageViews: [{
    page: {
      type: String,
      required: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
    },
    lesson: {
      type: Number,
      default: null
    },
    enteredAt: {
      type: Date,
      required: true
    },
    exitedAt: {
      type: Date,
      default: null
    },
    timeSpent: {
      type: Number, // Duration in seconds
      default: 0
    },
    interactions: {
      clicks: {
        type: Number,
        default: 0
      },
      scrollDepth: {
        type: Number, // percentage
        default: 0
      },
      videoProgress: {
        type: Number, // percentage
        default: 0
      },
      videoPauses: {
        type: Number,
        default: 0
      },
      downloadAttempts: {
        type: Number,
        default: 0
      }
    },
    device: {
      type: String,
      default: 'Unknown'
    }
  }],
  learningPatterns: {
    preferredStudyTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'unknown'],
      default: 'unknown'
    },
    averageSessionDuration: {
      type: Number, // in minutes
      default: 0
    },
    mostActiveDay: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'unknown'],
      default: 'unknown'
    },
    consistencyScore: {
      type: Number, // 0-100
      default: 0
    },
    learningPace: {
      type: String,
      enum: ['slow', 'moderate', 'fast', 'variable', 'unknown'],
      default: 'unknown'
    },
    preferredContentTypes: {
      video: {
        type: Number, // engagement score 0-100
        default: 0
      },
      text: {
        type: Number,
        default: 0
      },
      quiz: {
        type: Number,
        default: 0
      },
      interactive: {
        type: Number,
        default: 0
      },
      discussion: {
        type: Number,
        default: 0
      }
    },
    preferredSubjects: [{
      category: String,
      engagementScore: Number
    }],
    studyHabits: {
      continuousSessions: {
        type: Boolean,
        default: false
      },
      breakFrequency: {
        type: Number, // average breaks per hour
        default: 0
      },
      multitasking: {
        type: Boolean,
        default: false
      },
      reviewFrequency: {
        type: Number, // times revisiting completed content
        default: 0
      }
    },
    lastCalculated: {
      type: Date,
      default: null
    }
  },
  courseEngagement: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0
    },
    averageTimePerLesson: {
      type: Number, // in minutes
      default: 0
    },
    completionRate: {
      type: Number, // percentage
      default: 0
    },
    engagementScore: {
      type: Number, // 0-100
      default: 0
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', 'unknown'],
      default: 'unknown'
    },
    lessonEngagement: [{
      lessonNumber: Number,
      timeSpent: Number, // in minutes
      attempts: Number,
      completed: Boolean,
      difficulty: {
        type: String,
        enum: ['easy', 'moderate', 'challenging', 'unknown'],
        default: 'unknown'
      },
      lastAccessed: Date
    }],
    quizPerformance: [{
      quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
      },
      score: Number,
      attempts: Number,
      timeSpent: Number, // in minutes
      completedAt: Date,
      incorrectAnswers: Number
    }],
    notes: [{
      content: String,
      lessonNumber: Number,
      createdAt: Date
    }],
    bookmarks: [{
      lessonNumber: Number,
      timestamp: Number, // for videos
      note: String,
      createdAt: Date
    }]
  }],
  socialInteractions: {
    discussionPosts: [{
      post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discussion'
      },
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      },
      createdAt: Date,
      likes: Number,
      replies: Number
    }],
    comments: [{
      content: String,
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      },
      lessonNumber: Number,
      createdAt: Date,
      likes: Number
    }],
    collaborations: [{
      groupId: String,
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      },
      joinedAt: Date,
      contributionsCount: Number,
      lastActive: Date
    }],
    peerRatings: {
      given: Number,
      received: Number,
      averageReceived: Number // 1-5 scale
    }
  },
  inactivityPeriods: [{
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // in days
      default: 0
    },
    reason: {
      type: String,
      default: 'unknown'
    },
    notified: {
      type: Boolean,
      default: false
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['login', 'course_completion', 'inactivity', 'achievement', 'system', 'ai_suggestion'],
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
    },
    actionUrl: {
      type: String,
      default: null
    }
  }],
  aiInteractions: [{
    questionId: {
      type: String,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    response: {
      type: String,
      required: true
    },
    feedback: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    helpful: {
      type: Boolean,
      default: null
    }
  }],
  supportRequests: [{
    type: {
      type: String,
      enum: ['technical', 'content', 'account', 'billing', 'other'],
      required: true
    },
    issue: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    createdAt: Date,
    resolved: Boolean,
    resolutionTime: Number // in hours
  }],
  technicalIssues: [{
    type: {
      type: String,
      enum: ['video', 'audio', 'download', 'upload', 'connection', 'browser', 'other'],
      required: true
    },
    device: String,
    browser: String,
    operatingSystem: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    lessonNumber: Number,
    errorMessage: String,
    createdAt: Date,
    resolved: Boolean
  }],
  accessibilityPreferences: {
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'x-large'],
      default: 'medium'
    },
    highContrast: {
      type: Boolean,
      default: false
    },
    reducedMotion: {
      type: Boolean,
      default: false
    },
    screenReader: {
      type: Boolean,
      default: false
    },
    captionsEnabled: {
      type: Boolean,
      default: false
    },
    colorBlindMode: {
      type: Boolean,
      default: false
    },
    keyboardNavigation: {
      type: Boolean,
      default: false
    }
  },
  uiPreferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    dashboardLayout: {
      type: String,
      enum: ['grid', 'list', 'compact'],
      default: 'grid'
    },
    contentDensity: {
      type: String,
      enum: ['comfortable', 'compact'],
      default: 'comfortable'
    },
    autoplayVideos: {
      type: Boolean,
      default: true
    },
    showCompletedCourses: {
      type: Boolean,
      default: true
    }
  },
  schedulingPreferences: {
    reminderFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom', 'none'],
      default: 'daily'
    },
    reminderTime: String, // HH:MM format
    studyGoalMinutes: {
      type: Number,
      default: 30
    },
    studyDays: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: true },
      sunday: { type: Boolean, default: true }
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    calendarIntegration: {
      enabled: {
        type: Boolean,
        default: false
      },
      provider: {
        type: String,
        enum: ['google', 'outlook', 'apple', 'other', 'none'],
        default: 'none'
      }
    },
    deadlineReminders: {
      type: Number, // days before deadline
      default: 1
    }
  },
  externalFactors: {
    holidays: [{
      date: Date,
      name: String,
      affectedStudyTime: Number // in minutes
    }],
    examPeriods: [{
      startDate: Date,
      endDate: Date,
      impact: {
        type: String,
        enum: ['increased', 'decreased', 'unchanged'],
        default: 'unchanged'
      }
    }],
    workloadChanges: [{
      startDate: Date,
      endDate: Date,
      type: {
        type: String,
        enum: ['increased', 'decreased'],
        required: true
      },
      note: String
    }]
  },
  notificationPreferences: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'never'],
        default: 'daily'
      }
    },
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: {
        achievement: {
          type: Boolean,
          default: true
        },
        courseCompletion: {
          type: Boolean,
          default: true
        },
        inactivity: {
          type: Boolean,
          default: true
        },
        recommendation: {
          type: Boolean,
          default: true
        },
        streak: {
          type: Boolean,
          default: true
        },
        deadline: {
          type: Boolean,
          default: true
        },
        feedback: {
          type: Boolean,
          default: true
        },
        support: {
          type: Boolean,
          default: true
        }
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: false
      },
      token: String,
      platform: {
        type: String,
        enum: ['web', 'android', 'ios', 'none'],
        default: 'none'
      }
    },
    doNotDisturb: {
      enabled: {
        type: Boolean,
        default: false
      },
      startTime: String, // HH:MM format
      endTime: String, // HH:MM format
      timezone: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserData', UserDataSchema);
