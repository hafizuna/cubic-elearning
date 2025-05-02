const UserData = require('../models/UserData');
const User = require('../models/User');
const UserCourse = require('../models/UserCourse');
const Course = require('../models/Course');

/**
 * Middleware to track user activity and update the UserData model
 * Captures comprehensive data about user behavior, device information,
 * learning patterns, and engagement metrics
 */
const activityTracker = async (req, res, next) => {
  // Only track activity for authenticated users
  if (!req.user) {
    return next();
  }

  try {
    // Get current URL path and extract page type
    const path = req.originalUrl;
    let pageType = 'other';
    let courseId = null;
    let lessonNumber = null;

    // Determine page type and extract course ID if applicable
    if (path.includes('/api/courses/')) {
      pageType = 'course';
      // Extract course ID from URL
      const courseMatches = path.match(/\/api\/courses\/([a-f0-9]{24})/);
      if (courseMatches && courseMatches[1]) {
        courseId = courseMatches[1];
      }
      
      // Extract lesson number if present
      const lessonMatches = path.match(/\/lessons\/(\d+)/);
      if (lessonMatches && lessonMatches[1]) {
        lessonNumber = parseInt(lessonMatches[1]);
      }
    } else if (path.includes('/api/auth/')) {
      pageType = 'auth';
    } else if (path.includes('/api/users/')) {
      pageType = 'profile';
    } else if (path.includes('/api/quizzes/')) {
      pageType = 'quiz';
    } else if (path.includes('/api/discussions/')) {
      pageType = 'discussion';
    } else if (path.includes('/dashboard')) {
      pageType = 'dashboard';
    }

    // Get device and browser information
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const platform = detectPlatform(userAgent);
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    
    // Find or create user data
    let userData = await UserData.findOne({ user: req.user._id });
    if (!userData) {
      userData = new UserData({
        user: req.user._id,
        lastLogin: Date.now(),
        pageViews: [],
        learningPatterns: {
          preferredStudyTime: 'unknown',
          mostActiveDay: 'unknown',
          averageSessionDuration: 0,
          consistencyScore: 0,
          lastCalculated: null
        }
      });
    }

    // Check if there's an open page view that needs to be closed
    if (userData.pageViews && userData.pageViews.length > 0) {
      const lastPageView = userData.pageViews[userData.pageViews.length - 1];
      if (lastPageView && !lastPageView.exitedAt) {
        // Close the previous page view
        lastPageView.exitedAt = new Date();
        lastPageView.timeSpent = Math.floor((lastPageView.exitedAt - lastPageView.enteredAt) / 1000);
        
        // Update course engagement if this was a course page
        if (lastPageView.course) {
          await updateCourseEngagement(userData, lastPageView);
        }
      }
    }

    // Add new page view with enhanced data
    userData.pageViews.push({
      page: pageType,
      course: courseId,
      lesson: lessonNumber,
      enteredAt: new Date(),
      device: device,
      interactions: {
        clicks: 0,
        scrollDepth: 0,
        videoProgress: 0,
        videoPauses: 0,
        downloadAttempts: 0
      }
    });

    // Update learning patterns periodically
    const lastCalculated = userData.learningPatterns?.lastCalculated;
    if (!lastCalculated || (new Date() - new Date(lastCalculated)) > (24 * 60 * 60 * 1000)) {
      await updateLearningPatterns(userData);
    }

    // Check for inactivity
    await checkForInactivity(userData);

    // Track login/logout events
    if (path.includes('/api/auth/login') && req.method === 'POST') {
      // This is a login request
      await trackLogin(userData, req, device, browser, platform, ipAddress);
    } else if (path.includes('/api/auth/logout') && req.method === 'POST') {
      // This is a logout request
      await trackLogout(userData);
    }

    // If this is a course completion event, update course progress
    if (path.includes('/complete-lesson') && req.method === 'POST') {
      await trackLessonCompletion(userData, req);
    }

    // If this is a quiz submission, track quiz performance
    if (path.includes('/api/quizzes/submit') && req.method === 'POST') {
      await trackQuizSubmission(userData, req);
    }

    // Save the updated user data
    await userData.save();

    // Update user's lastActive timestamp
    await User.findByIdAndUpdate(req.user._id, { lastActive: Date.now() });

    next();
  } catch (error) {
    console.error('Activity tracking error:', error);
    // Don't block the request if tracking fails
    next();
  }
};

/**
 * Track user login events
 */
async function trackLogin(userData, req, device, browser, platform, ipAddress) {
  // Record login history
  userData.previousLogin = userData.lastLogin;
  userData.lastLogin = new Date();
  
  // Add to login history with enhanced device information
  userData.loginHistory.push({
    loginTime: new Date(),
    device: device,
    browser: browser,
    platform: platform,
    ipAddress: ipAddress,
    userAgent: req.headers['user-agent'] || 'Unknown',
    successful: true
  });
  
  // Create login notification if enabled
  if (userData.notificationPreferences?.inApp?.enabled) {
    userData.notifications.push({
      type: 'login',
      message: `Welcome back! You last logged in on ${new Date(userData.previousLogin).toLocaleDateString()}.`,
      createdAt: new Date(),
      priority: 'low'
    });
  }
}

/**
 * Track user logout events
 */
async function trackLogout(userData) {
  // Find the most recent login record
  if (userData.loginHistory && userData.loginHistory.length > 0) {
    const lastLogin = userData.loginHistory[userData.loginHistory.length - 1];
    if (lastLogin && !lastLogin.logoutTime) {
      // Update logout time and session duration
      lastLogin.logoutTime = new Date();
      lastLogin.sessionDuration = Math.floor((lastLogin.logoutTime - lastLogin.loginTime) / (1000 * 60)); // in minutes
    }
  }
}

/**
 * Track lesson completion events
 */
async function trackLessonCompletion(userData, req) {
  try {
    const courseId = req.params.id;
    const { lessonOrder } = req.body;
    
    if (!courseId || lessonOrder === undefined) return;
    
    // Find or create user course record
    let userCourse = await UserCourse.findOne({ user: req.user._id, course: courseId });
    if (!userCourse) return;
    
    // Find or create lesson details
    let lessonDetail = userCourse.lessonDetails?.find(ld => ld.lessonNumber === lessonOrder);
    
    if (!lessonDetail) {
      // Create new lesson detail
      if (!userCourse.lessonDetails) userCourse.lessonDetails = [];
      
      userCourse.lessonDetails.push({
        lessonNumber: lessonOrder,
        startedAt: new Date(), // Assume started now if no previous record
        completedAt: new Date(),
        timeSpent: 0, // Will be calculated from page views later
        attempts: 1,
        difficulty: 'unknown'
      });
    } else {
      // Update existing lesson detail
      lessonDetail.completedAt = new Date();
      lessonDetail.revisits += 1;
      lessonDetail.lastRevisited = new Date();
    }
    
    // Calculate time spent on this lesson from page views
    const lessonPageViews = userData.pageViews.filter(
      pv => pv.course && pv.course.toString() === courseId && pv.lesson === lessonOrder && pv.timeSpent
    );
    
    if (lessonPageViews.length > 0) {
      const totalTimeSpent = lessonPageViews.reduce((sum, pv) => sum + pv.timeSpent, 0);
      const timeSpentMinutes = Math.floor(totalTimeSpent / 60);
      
      // Update lesson detail with time spent
      if (userCourse.lessonDetails) {
        const lessonDetail = userCourse.lessonDetails.find(ld => ld.lessonNumber === lessonOrder);
        if (lessonDetail) {
          lessonDetail.timeSpent = timeSpentMinutes;
          
          // Determine difficulty based on time spent
          const course = await Course.findById(courseId);
          if (course && course.lessons && course.lessons[lessonOrder]) {
            const expectedDuration = course.lessons[lessonOrder].estimatedDuration || 30; // default 30 minutes
            
            if (timeSpentMinutes < expectedDuration * 0.7) {
              lessonDetail.difficulty = 'easy';
            } else if (timeSpentMinutes > expectedDuration * 1.5) {
              lessonDetail.difficulty = 'challenging';
            } else {
              lessonDetail.difficulty = 'moderate';
            }
          }
        }
      }
    }
    
    await userCourse.save();
  } catch (error) {
    console.error('Error tracking lesson completion:', error);
  }
}

/**
 * Track quiz submission events
 */
async function trackQuizSubmission(userData, req) {
  try {
    const { quizId, courseId, lessonNumber, score, answers } = req.body;
    
    if (!quizId || !courseId || lessonNumber === undefined || score === undefined) return;
    
    // Find user course record
    let userCourse = await UserCourse.findOne({ user: req.user._id, course: courseId });
    if (!userCourse) return;
    
    // Find existing quiz result or create new one
    let quizResult = userCourse.quizResults?.find(
      qr => qr.quizId.toString() === quizId.toString() && qr.lessonNumber === lessonNumber
    );
    
    if (!quizResult) {
      // Create new quiz result
      if (!userCourse.quizResults) userCourse.quizResults = [];
      
      userCourse.quizResults.push({
        quizId: quizId,
        lessonNumber: lessonNumber,
        score: score,
        attempts: 1,
        lastAttemptAt: new Date(),
        timeSpent: req.body.timeSpent || 0,
        correctAnswers: answers?.filter(a => a.correct).length || 0,
        incorrectAnswers: answers?.filter(a => !a.correct).length || 0,
        skippedQuestions: answers?.filter(a => a.skipped).length || 0
      });
    } else {
      // Update existing quiz result
      quizResult.attempts += 1;
      quizResult.lastAttemptAt = new Date();
      quizResult.score = score; // Update with latest score
      
      if (req.body.timeSpent) {
        quizResult.timeSpent += req.body.timeSpent;
      }
      
      if (answers) {
        quizResult.correctAnswers = answers.filter(a => a.correct).length;
        quizResult.incorrectAnswers = answers.filter(a => !a.correct).length;
        quizResult.skippedQuestions = answers.filter(a => a.skipped).length;
      }
    }
    
    await userCourse.save();
  } catch (error) {
    console.error('Error tracking quiz submission:', error);
  }
}

/**
 * Helper function to detect device type from user agent
 */
function detectDevice(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (/mobile/i.test(userAgent)) {
    if (/tablet/i.test(userAgent) || /ipad/i.test(userAgent)) {
      return 'Tablet';
    }
    return 'Mobile';
  }
  return 'Desktop';
}

/**
 * Helper function to detect browser from user agent
 */
function detectBrowser(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/edge/i.test(userAgent)) return 'Edge';
  if (/opera/i.test(userAgent)) return 'Opera';
  if (/msie|trident/i.test(userAgent)) return 'Internet Explorer';
  
  return 'Other';
}

/**
 * Helper function to detect platform from user agent
 */
function detectPlatform(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/macintosh|mac os/i.test(userAgent)) return 'MacOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  
  return 'Other';
}

/**
 * Update course engagement metrics
 */
async function updateCourseEngagement(userData, pageView) {
  try {
    if (!pageView.course) return;

    // Find existing course engagement or create new one
    let courseEngagement = userData.courseEngagement.find(
      ce => ce.course.toString() === pageView.course.toString()
    );

    if (!courseEngagement) {
      // Create new course engagement record
      userData.courseEngagement.push({
        course: pageView.course,
        lastAccessed: new Date(),
        totalTimeSpent: Math.floor(pageView.timeSpent / 60), // Convert seconds to minutes
        averageTimePerLesson: Math.floor(pageView.timeSpent / 60),
        completionRate: 0,
        engagementScore: 0,
        difficulty: 'unknown'
      });
    } else {
      // Update existing course engagement
      courseEngagement.lastAccessed = new Date();
      courseEngagement.totalTimeSpent += Math.floor(pageView.timeSpent / 60);
      
      // Update lesson engagement if we have lesson information
      if (pageView.lesson !== null && pageView.lesson !== undefined) {
        // Find existing lesson engagement or create new one
        let lessonEngagement = courseEngagement.lessonEngagement?.find(
          le => le.lessonNumber === pageView.lesson
        );
        
        if (!lessonEngagement) {
          // Create new lesson engagement
          if (!courseEngagement.lessonEngagement) courseEngagement.lessonEngagement = [];
          
          courseEngagement.lessonEngagement.push({
            lessonNumber: pageView.lesson,
            timeSpent: Math.floor(pageView.timeSpent / 60),
            attempts: 1,
            completed: false,
            lastAccessed: new Date()
          });
        } else {
          // Update existing lesson engagement
          lessonEngagement.timeSpent += Math.floor(pageView.timeSpent / 60);
          lessonEngagement.lastAccessed = new Date();
        }
        
        // Calculate average time per lesson
        if (courseEngagement.lessonEngagement && courseEngagement.lessonEngagement.length > 0) {
          const totalLessonTime = courseEngagement.lessonEngagement.reduce(
            (sum, lesson) => sum + lesson.timeSpent, 0
          );
          courseEngagement.averageTimePerLesson = Math.floor(
            totalLessonTime / courseEngagement.lessonEngagement.length
          );
        }
      }
      
      // Calculate engagement score (0-100) based on multiple factors
      // - Frequency of access (25%)
      // - Time spent (25%)
      // - Completion rate (25%)
      // - Interaction level (25%)
      try {
        // Get user course data to calculate completion rate
        const userCourse = await UserCourse.findOne({
          user: userData.user,
          course: pageView.course
        });
        
        if (userCourse) {
          // Update completion rate
          courseEngagement.completionRate = userCourse.progress || 0;
          
          // Calculate days since enrollment
          const daysSinceEnrollment = Math.floor(
            (new Date() - userCourse.createdAt) / (1000 * 60 * 60 * 24)
          ) || 1; // Minimum 1 day
          
          // Calculate frequency score (how often they access the course)
          const accessFrequency = Math.min(
            courseEngagement.lessonEngagement?.length / daysSinceEnrollment,
            1
          ) || 0.1;
          const frequencyScore = Math.min(accessFrequency * 25, 25);
          
          // Calculate time spent score
          const expectedTimePerCourse = 300; // 5 hours expected per course
          const timeSpentScore = Math.min(
            (courseEngagement.totalTimeSpent / expectedTimePerCourse) * 25,
            25
          );
          
          // Calculate completion score
          const completionScore = (courseEngagement.completionRate / 100) * 25;
          
          // Calculate interaction score based on page view interactions
          const interactionScore = Math.min(
            ((pageView.interactions?.clicks || 0) / 10 +
             (pageView.interactions?.scrollDepth || 0) / 100 +
             (pageView.interactions?.videoProgress || 0) / 100) * 25 / 3,
            25
          );
          
          // Calculate overall engagement score
          courseEngagement.engagementScore = Math.floor(
            frequencyScore + timeSpentScore + completionScore + interactionScore
          );
          
          // Determine course difficulty based on time spent vs expected time
          if (userCourse.difficultyRating !== 'not_rated') {
            courseEngagement.difficulty = userCourse.difficultyRating === 'too_easy' ? 'easy' :
                                         userCourse.difficultyRating === 'too_difficult' ? 'challenging' :
                                         'moderate';
          } else if (courseEngagement.lessonEngagement && courseEngagement.lessonEngagement.length > 0) {
            // Count difficulty levels across lessons
            const difficultyCounts = {
              easy: 0,
              moderate: 0,
              challenging: 0
            };
            
            courseEngagement.lessonEngagement.forEach(lesson => {
              if (lesson.difficulty && lesson.difficulty !== 'unknown') {
                difficultyCounts[lesson.difficulty]++;
              }
            });
            
            // Determine overall difficulty based on most common difficulty
            const maxDifficulty = Object.entries(difficultyCounts).reduce(
              (max, [difficulty, count]) => count > max.count ? {difficulty, count} : max,
              {difficulty: 'unknown', count: 0}
            );
            
            if (maxDifficulty.count > 0) {
              courseEngagement.difficulty = maxDifficulty.difficulty;
            }
          }
        }
      } catch (error) {
        console.error('Error calculating engagement score:', error);
      }
    }
  } catch (error) {
    console.error('Error updating course engagement:', error);
  }
}

/**
 * Update learning patterns based on user activity
 */
async function updateLearningPatterns(userData) {
  try {
    // Initialize learning patterns if not exists
    if (!userData.learningPatterns) {
      userData.learningPatterns = {
        preferredStudyTime: 'unknown',
        mostActiveDay: 'unknown',
        averageSessionDuration: 0,
        consistencyScore: 0,
        learningPace: 'unknown',
        preferredContentTypes: {
          video: 0,
          text: 0,
          quiz: 0,
          interactive: 0,
          discussion: 0
        },
        preferredSubjects: [],
        studyHabits: {
          continuousSessions: false,
          breakFrequency: 0,
          multitasking: false,
          reviewFrequency: 0
        },
        lastCalculated: new Date()
      };
      return;
    }
    
    // Only analyze if we have enough data (at least 3 login sessions)
    if (!userData.loginHistory || userData.loginHistory.length < 3) {
      userData.learningPatterns.lastCalculated = new Date();
      return;
    }
    
    // Calculate preferred study time
    const hourCounts = {
      morning: 0,   // 5:00 - 11:59
      afternoon: 0, // 12:00 - 16:59
      evening: 0,   // 17:00 - 21:59
      night: 0      // 22:00 - 4:59
    };
    
    // Analyze page views to determine study times
    userData.pageViews.forEach(view => {
      if (!view.enteredAt) return;
      
      const hour = new Date(view.enteredAt).getHours();
      
      if (hour >= 5 && hour < 12) {
        hourCounts.morning++;
      } else if (hour >= 12 && hour < 17) {
        hourCounts.afternoon++;
      } else if (hour >= 17 && hour < 22) {
        hourCounts.evening++;
      } else {
        hourCounts.night++;
      }
    });
    
    // Determine preferred study time
    const preferredTime = Object.entries(hourCounts).reduce(
      (max, [time, count]) => count > max.count ? {time, count} : max,
      {time: 'unknown', count: 0}
    );
    
    if (preferredTime.count > 0) {
      userData.learningPatterns.preferredStudyTime = preferredTime.time;
    }
    
    // Calculate most active day of the week
    const dayCounts = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    };
    
    // Analyze page views to determine active days
    userData.pageViews.forEach(view => {
      if (!view.enteredAt) return;
      
      const day = new Date(view.enteredAt).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      dayCounts[dayNames[day]]++;
    });
    
    // Determine most active day
    const mostActiveDay = Object.entries(dayCounts).reduce(
      (max, [day, count]) => count > max.count ? {day, count} : max,
      {day: 'unknown', count: 0}
    );
    
    if (mostActiveDay.count > 0) {
      userData.learningPatterns.mostActiveDay = mostActiveDay.day;
    }
    
    // Calculate average session duration
    if (userData.loginHistory && userData.loginHistory.length > 0) {
      const completedSessions = userData.loginHistory.filter(
        session => session.logoutTime && session.sessionDuration
      );
      
      if (completedSessions.length > 0) {
        const totalDuration = completedSessions.reduce(
          (sum, session) => sum + session.sessionDuration, 0
        );
        
        userData.learningPatterns.averageSessionDuration = Math.floor(
          totalDuration / completedSessions.length
        );
      }
    }
    
    // Calculate consistency score (0-100)
    // - Regular login frequency (40%)
    // - Consistent study times (30%)
    // - Completion of started courses (30%)
    try {
      // Calculate login frequency score
      const now = new Date();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      
      const recentLogins = userData.loginHistory.filter(
        login => new Date(login.loginTime) >= thirtyDaysAgo
      );
      
      const loginFrequencyScore = Math.min(recentLogins.length / 15, 1) * 40;
      
      // Calculate study time consistency
      const preferredTimePercentage = preferredTime.count / userData.pageViews.length;
      const studyTimeConsistencyScore = preferredTimePercentage * 30;
      
      // Calculate course completion consistency
      const userCourses = await UserCourse.find({ user: userData.user });
      let completionConsistencyScore = 0;
      
      if (userCourses && userCourses.length > 0) {
        const completedCourses = userCourses.filter(course => course.progress === 100).length;
        const startedCourses = userCourses.length;
        
        completionConsistencyScore = Math.min(completedCourses / startedCourses, 1) * 30;
      }
      
      // Calculate overall consistency score
      userData.learningPatterns.consistencyScore = Math.floor(
        loginFrequencyScore + studyTimeConsistencyScore + completionConsistencyScore
      );
      
      // Determine learning pace
      const coursesWithProgress = userCourses.filter(course => course.progress > 0);
      
      if (coursesWithProgress.length > 0) {
        // Calculate average progress per day for each course
        const pacesPerCourse = coursesWithProgress.map(course => {
          const daysSinceEnrollment = Math.max(
            Math.floor((now - course.createdAt) / (1000 * 60 * 60 * 24)),
            1
          );
          return course.progress / daysSinceEnrollment;
        });
        
        // Calculate average pace across all courses
        const averagePace = pacesPerCourse.reduce((sum, pace) => sum + pace, 0) / pacesPerCourse.length;
        
        // Determine pace category
        if (averagePace < 2) {
          userData.learningPatterns.learningPace = 'slow';
        } else if (averagePace < 5) {
          userData.learningPatterns.learningPace = 'moderate';
        } else {
          userData.learningPatterns.learningPace = 'fast';
        }
        
        // Check for high variability in pace
        const paceVariability = Math.max(...pacesPerCourse) / (Math.min(...pacesPerCourse) || 1);
        if (paceVariability > 3) {
          userData.learningPatterns.learningPace = 'variable';
        }
      }
      
      // Analyze preferred content types
      const contentTypeScores = {
        video: 0,
        text: 0,
        quiz: 0,
        interactive: 0,
        discussion: 0
      };
      
      // Count page views by type
      userData.pageViews.forEach(view => {
        if (view.page === 'course' && view.timeSpent > 30) {
          contentTypeScores.text += view.timeSpent;
        } else if (view.page === 'quiz') {
          contentTypeScores.quiz += view.timeSpent || 60;
        } else if (view.page === 'discussion') {
          contentTypeScores.discussion += view.timeSpent || 60;
        }
        
        // Count video interactions
        if (view.interactions && view.interactions.videoProgress > 0) {
          contentTypeScores.video += view.timeSpent || 60;
        }
        
        // Count interactive content
        if (view.interactions && (view.interactions.clicks > 10 || view.interactions.scrollDepth > 70)) {
          contentTypeScores.interactive += view.timeSpent || 60;
        }
      });
      
      // Normalize scores to 0-100 range
      const totalContentTime = Object.values(contentTypeScores).reduce((sum, time) => sum + time, 0);
      
      if (totalContentTime > 0) {
        Object.keys(contentTypeScores).forEach(type => {
          userData.learningPatterns.preferredContentTypes[type] = Math.floor(
            (contentTypeScores[type] / totalContentTime) * 100
          );
        });
      }
      
      // Analyze preferred subjects
      if (userData.courseEngagement && userData.courseEngagement.length > 0) {
        const subjectEngagement = {};
        
        // Get course categories and engagement scores
        for (const engagement of userData.courseEngagement) {
          try {
            const course = await Course.findById(engagement.course);
            
            if (course && course.category) {
              if (!subjectEngagement[course.category]) {
                subjectEngagement[course.category] = {
                  totalScore: 0,
                  count: 0
                };
              }
              
              subjectEngagement[course.category].totalScore += engagement.engagementScore || 0;
              subjectEngagement[course.category].count++;
            }
          } catch (error) {
            console.error('Error getting course category:', error);
          }
        }
        
        // Calculate average engagement score per category
        userData.learningPatterns.preferredSubjects = Object.entries(subjectEngagement)
          .map(([category, data]) => ({
            category,
            engagementScore: Math.floor(data.totalScore / data.count)
          }))
          .sort((a, b) => b.engagementScore - a.engagementScore);
      }
      
      // Analyze study habits
      // Check for continuous sessions (few breaks)
      if (userData.loginHistory && userData.loginHistory.length > 0) {
        const sessionsWithDuration = userData.loginHistory.filter(
          session => session.sessionDuration && session.sessionDuration > 30
        );
        
        if (sessionsWithDuration.length > 0) {
          // Long sessions without breaks indicate continuous study
          const longSessions = sessionsWithDuration.filter(
            session => session.sessionDuration > 90
          );
          
          userData.learningPatterns.studyHabits.continuousSessions = 
            longSessions.length / sessionsWithDuration.length > 0.5;
          
          // Estimate break frequency (breaks per hour)
          // We'll use page view gaps as a proxy for breaks
          const pageViewGaps = [];
          
          for (let i = 1; i < userData.pageViews.length; i++) {
            const currentView = userData.pageViews[i];
            const previousView = userData.pageViews[i - 1];
            
            if (currentView.enteredAt && previousView.exitedAt) {
              const gap = (new Date(currentView.enteredAt) - new Date(previousView.exitedAt)) / 1000;
              
              // Gaps between 5 and 30 minutes are considered breaks
              if (gap >= 300 && gap <= 1800) {
                pageViewGaps.push(gap);
              }
            }
          }
          
          // Calculate average breaks per hour
          if (pageViewGaps.length > 0) {
            const totalStudyHours = sessionsWithDuration.reduce(
              (sum, session) => sum + session.sessionDuration / 60, 0
            );
            
            userData.learningPatterns.studyHabits.breakFrequency = 
              Math.round((pageViewGaps.length / totalStudyHours) * 10) / 10;
          }
          
          // Detect multitasking based on rapid switching between pages
          const rapidSwitches = [];
          
          for (let i = 1; i < userData.pageViews.length; i++) {
            const currentView = userData.pageViews[i];
            const previousView = userData.pageViews[i - 1];
            
            if (currentView.enteredAt && previousView.exitedAt) {
              const timeOnPage = previousView.timeSpent;
              
              // Rapid switching is defined as spending less than 30 seconds on a page
              if (timeOnPage < 30) {
                rapidSwitches.push(timeOnPage);
              }
            }
          }
          
          // If more than 20% of page views are rapid switches, consider it multitasking
          userData.learningPatterns.studyHabits.multitasking = 
            rapidSwitches.length / userData.pageViews.length > 0.2;
          
          // Calculate review frequency (revisiting completed content)
          const userCourses = await UserCourse.find({ user: userData.user });
          let totalRevisits = 0;
          
          for (const course of userCourses) {
            if (course.lessonDetails) {
              const revisitedLessons = course.lessonDetails.filter(
                lesson => lesson.revisits > 0
              );
              
              totalRevisits += revisitedLessons.length;
            }
          }
          
          // Calculate average revisits per completed lesson
          const totalCompletedLessons = userCourses.reduce(
            (sum, course) => sum + (course.completedLessons?.length || 0),
            0
          );
          
          if (totalCompletedLessons > 0) {
            userData.learningPatterns.studyHabits.reviewFrequency = 
              Math.round((totalRevisits / totalCompletedLessons) * 10) / 10;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating learning patterns:', error);
    }
    
    // Update last calculated timestamp
    userData.learningPatterns.lastCalculated = new Date();
  } catch (error) {
    console.error('Error updating learning patterns:', error);
  }
}

/**
 * Check for inactivity periods and create notifications if needed
 */
async function checkForInactivity(userData) {
  try {
    const now = new Date();
    const lastActive = userData.lastLogin;
    
    if (!lastActive) return;
    
    const daysSinceLastActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
    
    // Check if there's an open inactivity period
    let currentInactivityPeriod = null;
    
    if (userData.inactivityPeriods && userData.inactivityPeriods.length > 0) {
      currentInactivityPeriod = userData.inactivityPeriods.find(period => !period.endDate);
    }
    
    // If user was inactive but now active, close the inactivity period
    if (currentInactivityPeriod && daysSinceLastActive < 3) {
      currentInactivityPeriod.endDate = now;
      currentInactivityPeriod.duration = Math.floor(
        (currentInactivityPeriod.endDate - currentInactivityPeriod.startDate) / (1000 * 60 * 60 * 24)
      );
      
      // Create welcome back notification
      if (userData.notificationPreferences?.inApp?.enabled &&
          userData.notificationPreferences?.inApp?.types?.inactivity) {
        userData.notifications.push({
          type: 'inactivity',
          message: `Welcome back! You've returned after ${currentInactivityPeriod.duration} days away.`,
          createdAt: now,
          priority: 'medium',
          actionRequired: false
        });
      }
    }
    // If user is inactive for 3+ days and no open inactivity period, create one
    else if (!currentInactivityPeriod && daysSinceLastActive >= 3) {
      // Create new inactivity period
      if (!userData.inactivityPeriods) {
        userData.inactivityPeriods = [];
      }
      
      userData.inactivityPeriods.push({
        startDate: new Date(now - daysSinceLastActive * 24 * 60 * 60 * 1000),
        endDate: null,
        duration: daysSinceLastActive,
        notified: false,
        reason: 'unknown'
      });
      
      currentInactivityPeriod = userData.inactivityPeriods[userData.inactivityPeriods.length - 1];
    }
    
    // Send inactivity notifications at different thresholds if not already notified
    if (currentInactivityPeriod && !currentInactivityPeriod.notified) {
      // Only send notifications if user has enabled them
      if (userData.notificationPreferences?.inApp?.enabled &&
          userData.notificationPreferences?.inApp?.types?.inactivity) {
        
        let notificationMessage = '';
        let priority = 'medium';
        
        if (daysSinceLastActive >= 14) {
          notificationMessage = "We miss you! It's been two weeks since your last visit. Your learning progress is waiting for you.";
          priority = 'high';
        } else if (daysSinceLastActive >= 7) {
          notificationMessage = "It's been a week since your last learning session. Don't lose your momentum!";
          priority = 'medium';
        } else if (daysSinceLastActive >= 3) {
          notificationMessage = "We noticed you haven't logged in for a few days. Ready to continue learning?";
          priority = 'low';
        }
        
        if (notificationMessage) {
          userData.notifications.push({
            type: 'inactivity',
            message: notificationMessage,
            createdAt: now,
            priority: priority,
            actionRequired: false,
            actionLink: '/dashboard'
          });
          
          currentInactivityPeriod.notified = true;
        }
      }
    }
    
    // Analyze patterns in inactivity periods
    if (userData.inactivityPeriods && userData.inactivityPeriods.length > 1) {
      // Check for recurring inactivity on specific days (weekends, etc.)
      const inactivityDays = userData.inactivityPeriods
        .filter(period => period.startDate)
        .map(period => new Date(period.startDate).getDay());
      
      const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
      
      inactivityDays.forEach(day => {
        dayCounts[day]++;
      });
      
      const maxInactiveDay = dayCounts.indexOf(Math.max(...dayCounts));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // If there's a clear pattern of inactivity on a specific day
      if (dayCounts[maxInactiveDay] > userData.inactivityPeriods.length * 0.5) {
        // Create a personalized notification about the pattern
        if (userData.notificationPreferences?.inApp?.enabled &&
            userData.notificationPreferences?.inApp?.types?.recommendation) {
          
          userData.notifications.push({
            type: 'recommendation',
            message: `We've noticed you often take breaks on ${dayNames[maxInactiveDay]}. Would you like to set a different study schedule for that day?`,
            createdAt: now,
            priority: 'low',
            actionRequired: false,
            actionLink: '/settings/schedule'
          });
        }
      }
    }
    
    // Check for external factors that might affect learning schedule
    // This would ideally connect to a calendar API or holiday API
    // For now, we'll use a simple approach to detect common holiday periods
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Check for major holiday periods
    let holidayPeriod = null;
    
    if ((currentMonth === 11 && currentDay >= 20) || (currentMonth === 0 && currentDay <= 5)) {
      holidayPeriod = "the winter holidays";
    } else if (currentMonth === 6 && currentDay >= 1 && currentDay <= 31) {
      holidayPeriod = "summer vacation";
    }
    
    // If user is inactive during a holiday period, update the reason
    if (holidayPeriod && currentInactivityPeriod && currentInactivityPeriod.reason === 'unknown') {
      currentInactivityPeriod.reason = 'holiday';
      
      // Add holiday to external factors if not already present
      if (!userData.externalFactors) {
        userData.externalFactors = {
          holidays: []
        };
      }
      
      if (!userData.externalFactors.holidays) {
        userData.externalFactors.holidays = [];
      }
      
      // Check if this holiday is already recorded
      const holidayExists = userData.externalFactors.holidays.some(
        h => h.name === holidayPeriod
      );
      
      if (!holidayExists) {
        userData.externalFactors.holidays.push({
          date: now,
          name: holidayPeriod,
          affectedStudyTime: currentInactivityPeriod.duration * 24 * 60 // in minutes
        });
      }
    }
  } catch (error) {
    console.error('Error checking for inactivity:', error);
  }
}

module.exports = activityTracker;
