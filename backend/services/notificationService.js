const UserData = require('../models/UserData');
const UserCourse = require('../models/UserCourse');
const Course = require('../models/Course');
const User = require('../models/User');

/**
 * Service for generating personalized notifications based on user activity
 */
class NotificationService {
  /**
   * Generate personalized notifications for a user
   * @param {string} userId - The user ID
   */
  static async generatePersonalizedNotifications(userId) {
    try {
      const userData = await UserData.findOne({ user: userId });
      if (!userData) return [];

      const now = new Date();
      const notifications = [];

      // Get user's courses and user profile
      const userCourses = await UserCourse.find({ user: userId }).populate('course');
      const userProfile = await User.findById(userId);
      
      // Generate different types of notifications
      await Promise.all([
        this.generateCourseRecommendations(userData, userCourses, notifications),
        this.generateConsistencyReminders(userData, notifications),
        this.generateProgressMilestones(userData, userCourses, notifications),
        this.generateInactivityReminders(userData, userCourses, notifications),
        this.generateStreakNotifications(userData, userProfile, notifications),
        this.generateLearningPatternInsights(userData, notifications),
        this.generateStudyScheduleReminders(userData, userCourses, notifications),
        this.generateTimeManagementSuggestions(userData, userCourses, notifications),
        this.generateDifficultyAdjustmentSuggestions(userData, userCourses, notifications),
        this.generateAISuggestions(userData, notifications)
      ]);

      // Add all generated notifications to user data
      if (notifications.length > 0) {
        userData.notifications.push(...notifications);
        await userData.save();
      }

      return notifications;
    } catch (error) {
      console.error('Error generating personalized notifications:', error);
      return [];
    }
  }

  /**
   * Generate course recommendations based on user's learning patterns
   */
  static async generateCourseRecommendations(userData, userCourses, notifications) {
    try {
      // Only recommend if user has completed at least one course
      const completedCourses = userCourses.filter(uc => uc.progress === 100);
      if (completedCourses.length === 0) return;

      // Get user's preferred subjects from learning patterns
      const preferredSubjects = userData.learningPatterns?.preferredSubjects || [];
      if (preferredSubjects.length === 0) return;

      // Get top preferred subject
      const topSubject = preferredSubjects[0]?.category;
      if (!topSubject) return;

      // Find courses in the same category that user hasn't enrolled in
      const enrolledCourseIds = userCourses.map(uc => uc.course._id.toString());
      const recommendedCourses = await Course.find({
        category: topSubject,
        _id: { $nin: enrolledCourseIds }
      }).limit(3);

      if (recommendedCourses.length > 0) {
        // Create recommendation notification
        const course = recommendedCourses[0];
        notifications.push({
          type: 'recommendation',
          message: `Based on your interest in ${topSubject}, we think you'll enjoy "${course.title}". Check it out!`,
          createdAt: new Date(),
          relatedCourse: course._id,
          priority: 'medium',
          actionRequired: false,
          actionLink: `/courses/${course._id}`
        });
      }
    } catch (error) {
      console.error('Error generating course recommendations:', error);
    }
  }

  /**
   * Generate consistency reminders based on user's learning patterns
   */
  static async generateConsistencyReminders(userData, notifications) {
    try {
      // Check if user has learning patterns data
      if (!userData.learningPatterns) return;

      const { learningPace, preferredContentTypes, studyHabits } = userData.learningPatterns;
      
      // Provide insights based on learning pace
      if (learningPace === 'fast') {
        notifications.push({
          type: 'insight',
          message: `You're progressing quickly through courses. Consider exploring advanced topics or taking on more challenging courses.`,
          createdAt: new Date(),
          priority: 'low',
          actionRequired: false,
          actionLink: '/courses'
        });
      } else if (learningPace === 'slow') {
        notifications.push({
          type: 'insight',
          message: `You seem to take your time with course material. Try our bite-sized learning modules for more manageable sessions.`,
          createdAt: new Date(),
          priority: 'low',
          actionRequired: false,
          actionLink: '/settings/learning-preferences'
        });
      } else if (learningPace === 'variable') {
        notifications.push({
          type: 'insight',
          message: `Your learning pace varies significantly between courses. Consider focusing on one course at a time for better progress.`,
          createdAt: new Date(),
          priority: 'low',
          actionRequired: false,
          actionLink: '/dashboard'
        });
      }
      
      // Provide insights based on preferred content types
      if (preferredContentTypes) {
        const preferredType = Object.entries(preferredContentTypes)
          .sort(([, a], [, b]) => b - a)[0];
        
        if (preferredType && preferredType[1] > 50) {
          const contentTypeMessages = {
            video: `You seem to engage well with video content. We've highlighted video-rich courses for you.`,
            text: `You prefer text-based learning. Check out our new reading-focused courses.`,
            quiz: `You engage most with interactive quizzes. Try our quiz-heavy courses for better retention.`,
            interactive: `You thrive with interactive content. Explore our simulation-based courses.`,
            discussion: `You're an active participant in discussions. Join our learning communities for collaborative growth.`
          };
          
          if (contentTypeMessages[preferredType[0]]) {
            notifications.push({
              type: 'insight',
              message: contentTypeMessages[preferredType[0]],
              createdAt: new Date(),
              priority: 'low',
              actionRequired: false,
              actionLink: '/courses'
            });
          }
        }
      }
      
      // Provide insights based on study habits
      if (studyHabits) {
        if (studyHabits.continuousSessions) {
          notifications.push({
            type: 'insight',
            message: `You tend to study in long sessions. Remember to take breaks to optimize learning and retention.`,
            createdAt: new Date(),
            priority: 'low',
            actionRequired: false,
            actionLink: '/settings/learning-preferences'
          });
        }
        
        if (studyHabits.multitasking) {
          notifications.push({
            type: 'insight',
            message: `We've noticed you often multitask during learning. Focused study sessions may improve your retention.`,
            createdAt: new Date(),
            priority: 'low',
            actionRequired: false,
            actionLink: '/settings/learning-preferences'
          });
        }
        
        if (studyHabits.reviewFrequency < 0.2 && userData.pageViews.length > 20) {
          notifications.push({
            type: 'insight',
            message: `Reviewing completed lessons can boost retention by up to 70%. Consider revisiting key concepts regularly.`,
            createdAt: new Date(),
            priority: 'medium',
            actionRequired: false,
            actionLink: '/dashboard'
          });
        }
      }
    } catch (error) {
      console.error('Error generating consistency reminders:', error);
    }
  }

  /**
   * Generate progress milestone notifications
   */
  static async generateProgressMilestones(userData, userCourses, notifications) {
    try {
      // Check for courses that are close to completion (75-99%)
      const nearCompletionCourses = userCourses.filter(
        uc => uc.progress >= 75 && uc.progress < 100
      );

      if (nearCompletionCourses.length > 0) {
        // Sort by highest progress first
        nearCompletionCourses.sort((a, b) => b.progress - a.progress);
        
        const course = nearCompletionCourses[0];
        const remainingPercent = 100 - course.progress;
        
        notifications.push({
          type: 'milestone',
          message: `You're just ${remainingPercent}% away from completing "${course.course.title}"! Finish strong!`,
          createdAt: new Date(),
          relatedCourse: course.course._id,
          priority: 'medium',
          actionRequired: false,
          actionLink: `/courses/${course.course._id}`
        });
      }

      // Check for courses with exactly 50% completion
      const halfwayCompletedCourses = userCourses.filter(uc => 
        uc.progress >= 45 && uc.progress <= 55 && 
        !uc.course.halfwayNotificationSent
      );

      if (halfwayCompletedCourses.length > 0) {
        const course = halfwayCompletedCourses[0];
        
        notifications.push({
          type: 'milestone',
          message: `You've reached the halfway point in "${course.course.title}"! Keep up the great work!`,
          createdAt: new Date(),
          relatedCourse: course.course._id,
          priority: 'medium',
          actionRequired: false,
          actionLink: `/courses/${course.course._id}`
        });
        
        // Mark as sent so we don't send it again
        course.course.halfwayNotificationSent = true;
        await course.course.save();
      }

      // Check for recently completed courses (within last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentlyCompletedCourses = userCourses.filter(uc => {
        // Check if progress is 100% and there's a certificate that was issued in the last 24 hours
        return uc.progress === 100 && 
               uc.certificateIssuedAt && 
               new Date(uc.certificateIssuedAt) >= oneDayAgo;
      });

      if (recentlyCompletedCourses.length > 0) {
        const course = recentlyCompletedCourses[0];
        
        notifications.push({
          type: 'achievement',
          message: `Congratulations on completing "${course.course.title}"! Your certificate is ready to download.`,
          createdAt: new Date(),
          relatedCourse: course.course._id,
          priority: 'high',
          actionRequired: false,
          actionLink: `/certificates/${course.course._id}`
        });
      }
    } catch (error) {
      console.error('Error generating progress milestones:', error);
    }
  }

  /**
   * Generate inactivity reminders
   */
  static async generateInactivityReminders(userData, userCourses, notifications) {
    try {
      // Check for in-progress courses with no activity in the last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      
      const inactiveCourses = userCourses.filter(uc => {
        return uc.progress > 0 && 
               uc.progress < 100 && 
               new Date(uc.lastAccessed) < sevenDaysAgo;
      });

      if (inactiveCourses.length > 0) {
        // Sort by highest progress first
        inactiveCourses.sort((a, b) => b.progress - a.progress);
        
        const course = inactiveCourses[0];
        const daysSinceAccess = Math.floor((now - new Date(course.lastAccessed)) / (1000 * 60 * 60 * 24));
        
        notifications.push({
          type: 'inactivity',
          message: `It's been ${daysSinceAccess} days since you worked on "${course.course.title}". Ready to continue?`,
          createdAt: new Date(),
          relatedCourse: course.course._id,
          priority: 'medium',
          actionRequired: false,
          actionLink: `/courses/${course.course._id}`
        });
      }
    } catch (error) {
      console.error('Error generating inactivity reminders:', error);
    }
  }

  /**
   * Generate streak notifications
   */
  static async generateStreakNotifications(userData, userProfile, notifications) {
    try {
      if (!userProfile) return;
      
      const streakCount = userProfile.streakCount || 0;
      
      // Celebrate streak milestones
      if (streakCount > 0 && streakCount % 7 === 0) {
        // Weekly streak milestone
        notifications.push({
          type: 'streak',
          message: `Amazing! You've maintained a ${streakCount}-day learning streak. Keep it up!`,
          createdAt: new Date(),
          priority: 'medium',
          actionRequired: false,
          actionLink: '/dashboard'
        });
      } else if (streakCount > 0 && streakCount % 30 === 0) {
        // Monthly streak milestone
        notifications.push({
          type: 'streak',
          message: `Incredible discipline! Your ${streakCount}-day learning streak shows real commitment to your growth.`,
          createdAt: new Date(),
          priority: 'high',
          actionRequired: false,
          actionLink: '/dashboard'
        });
      } else if (streakCount > 0 && streakCount % 100 === 0) {
        // Major streak milestone
        notifications.push({
          type: 'streak',
          message: `Extraordinary achievement! ${streakCount} days of consecutive learning makes you a true lifelong learner.`,
          createdAt: new Date(),
          priority: 'high',
          actionRequired: false,
          actionLink: '/dashboard'
        });
      }
      
      // Streak at risk notification
      const lastActive = new Date(userProfile.lastActive);
      const now = new Date();
      const hoursSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60));
      
      if (streakCount > 3 && hoursSinceActive >= 20) {
        notifications.push({
          type: 'streak',
          message: `Your ${streakCount}-day streak will end if you don't complete a lesson in the next ${24 - hoursSinceActive} hours!`,
          createdAt: new Date(),
          priority: 'high',
          actionRequired: true,
          actionLink: '/courses'
        });
      }
    } catch (error) {
      console.error('Error generating streak notifications:', error);
    }
  }

  /**
   * Generate learning pattern insights
   */
  static async generateLearningPatternInsights(userData, notifications) {
    try {
      if (!userData.learningPatterns) return;
      
      const { learningPace, preferredContentTypes, studyHabits } = userData.learningPatterns;
      
      // Provide insights based on learning pace
      if (learningPace === 'fast') {
        notifications.push({
          type: 'insight',
          message: `You're progressing quickly through courses. Consider exploring advanced topics or taking on more challenging courses.`,
          createdAt: new Date(),
          priority: 'low',
          actionRequired: false,
          actionLink: '/courses'
        });
      } else if (learningPace === 'slow') {
        notifications.push({
          type: 'insight',
          message: `You seem to take your time with course material. Try our bite-sized learning modules for more manageable sessions.`,
          createdAt: new Date(),
          priority: 'low',
          actionRequired: false,
          actionLink: '/settings/learning-preferences'
        });
      } else if (learningPace === 'variable') {
        notifications.push({
          type: 'insight',
          message: `Your learning pace varies significantly between courses. Consider focusing on one course at a time for better progress.`,
          createdAt: new Date(),
          priority: 'low',
          actionRequired: false,
          actionLink: '/dashboard'
        });
      }
      
      // Provide insights based on preferred content types
      if (preferredContentTypes) {
        const preferredType = Object.entries(preferredContentTypes)
          .sort(([, a], [, b]) => b - a)[0];
        
        if (preferredType && preferredType[1] > 50) {
          const contentTypeMessages = {
            video: `You seem to engage well with video content. We've highlighted video-rich courses for you.`,
            text: `You prefer text-based learning. Check out our new reading-focused courses.`,
            quiz: `You engage most with interactive quizzes. Try our quiz-heavy courses for better retention.`,
            interactive: `You thrive with interactive content. Explore our simulation-based courses.`,
            discussion: `You're an active participant in discussions. Join our learning communities for collaborative growth.`
          };
          
          if (contentTypeMessages[preferredType[0]]) {
            notifications.push({
              type: 'insight',
              message: contentTypeMessages[preferredType[0]],
              createdAt: new Date(),
              priority: 'low',
              actionRequired: false,
              actionLink: '/courses'
            });
          }
        }
      }
      
      // Provide insights based on study habits
      if (studyHabits) {
        if (studyHabits.continuousSessions) {
          notifications.push({
            type: 'insight',
            message: `You tend to study in long sessions. Remember to take breaks to optimize learning and retention.`,
            createdAt: new Date(),
            priority: 'low',
            actionRequired: false,
            actionLink: '/settings/learning-preferences'
          });
        }
        
        if (studyHabits.multitasking) {
          notifications.push({
            type: 'insight',
            message: `We've noticed you often multitask during learning. Focused study sessions may improve your retention.`,
            createdAt: new Date(),
            priority: 'low',
            actionRequired: false,
            actionLink: '/settings/learning-preferences'
          });
        }
        
        if (studyHabits.reviewFrequency < 0.2 && userData.pageViews.length > 20) {
          notifications.push({
            type: 'insight',
            message: `Reviewing completed lessons can boost retention by up to 70%. Consider revisiting key concepts regularly.`,
            createdAt: new Date(),
            priority: 'medium',
            actionRequired: false,
            actionLink: '/dashboard'
          });
        }
      }
    } catch (error) {
      console.error('Error generating learning pattern insights:', error);
    }
  }

  /**
   * Generate study schedule reminders
   */
  static async generateStudyScheduleReminders(userData, userCourses, notifications) {
    try {
      // Check if user has study schedule preferences
      if (!userData.schedulingPreferences) return;
      
      const { reminderFrequency, studyDays, reminderTime } = userData.schedulingPreferences;
      if (reminderFrequency === 'none') return;
      
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      
      // Check if today is a scheduled study day
      if (studyDays && studyDays[currentDay]) {
        // Check if we should send a reminder based on time
        if (reminderTime) {
          const [scheduledHour, scheduledMinute] = reminderTime.split(':').map(Number);
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // If it's within 15 minutes of scheduled time
          if (currentHour === scheduledHour && 
              Math.abs(currentMinute - scheduledMinute) <= 15) {
            
            // Find a course to recommend
            const inProgressCourses = userCourses.filter(uc => 
              uc.progress > 0 && uc.progress < 100
            );
            
            if (inProgressCourses.length > 0) {
              // Sort by most recently accessed
              inProgressCourses.sort((a, b) => 
                new Date(b.lastAccessed) - new Date(a.lastAccessed)
              );
              
              const course = inProgressCourses[0];
              
              notifications.push({
                type: 'reminder',
                message: `It's your scheduled study time! Continue learning "${course.course.title}" to maintain your progress.`,
                createdAt: new Date(),
                relatedCourse: course.course._id,
                priority: 'medium',
                actionRequired: false,
                actionLink: `/courses/${course.course._id}`
              });
            } else {
              notifications.push({
                type: 'reminder',
                message: `It's your scheduled study time! What would you like to learn today?`,
                createdAt: new Date(),
                priority: 'medium',
                actionRequired: false,
                actionLink: '/courses'
              });
            }
          }
        }
      }
      
      // Check for upcoming deadlines
      if (userData.schedulingPreferences.deadlineReminders > 0) {
        const deadlineReminderDays = userData.schedulingPreferences.deadlineReminders;
        
        // Check user's courses for target completion dates
        for (const userCourse of userCourses) {
          if (userCourse.learningGoals && 
              userCourse.learningGoals.targetCompletionDate && 
              userCourse.progress < 100) {
            
            const targetDate = new Date(userCourse.learningGoals.targetCompletionDate);
            const daysUntilDeadline = Math.floor((targetDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDeadline === deadlineReminderDays) {
              const remainingProgress = 100 - userCourse.progress;
              
              notifications.push({
                type: 'deadline',
                message: `You have ${daysUntilDeadline} days to complete "${userCourse.course.title}". You still need to complete ${remainingProgress}% of the course.`,
                createdAt: new Date(),
                relatedCourse: userCourse.course._id,
                priority: 'high',
                actionRequired: true,
                actionLink: `/courses/${userCourse.course._id}`
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating study schedule reminders:', error);
    }
  }

  /**
   * Generate time management suggestions
   */
  static async generateTimeManagementSuggestions(userData, userCourses, notifications) {
    try {
      // Only generate if user has enough activity data
      if (!userData.pageViews || userData.pageViews.length < 10) return;
      
      const now = new Date();
      
      // Calculate average session duration
      const sessionDurations = userData.loginHistory
        .filter(session => session.sessionDuration > 0)
        .map(session => session.sessionDuration);
      
      if (sessionDurations.length === 0) return;
      
      const averageSessionDuration = sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length;
      
      // If average session is very short (less than 15 minutes)
      if (averageSessionDuration < 15 && sessionDurations.length > 5) {
        notifications.push({
          type: 'recommendation',
          message: `Your learning sessions average just ${Math.round(averageSessionDuration)} minutes. Try scheduling 25-minute focused sessions for better results.`,
          createdAt: new Date(),
          priority: 'medium',
          actionRequired: false,
          actionLink: '/settings/learning-preferences'
        });
      }
      
      // If user has many in-progress courses (more than 3)
      const inProgressCourses = userCourses.filter(uc => 
        uc.progress > 0 && uc.progress < 100
      );
      
      if (inProgressCourses.length > 3) {
        notifications.push({
          type: 'recommendation',
          message: `You have ${inProgressCourses.length} courses in progress. Consider focusing on 1-2 courses at a time for better completion rates.`,
          createdAt: new Date(),
          priority: 'medium',
          actionRequired: false,
          actionLink: '/dashboard'
        });
      }
      
      // Check for optimal study times based on performance
      if (userData.courseEngagement && userData.courseEngagement.length > 0) {
        // Group page views by hour of day
        const hourlyEngagement = {};
        
        userData.pageViews.forEach(view => {
          if (!view.enteredAt || !view.timeSpent) return;
          
          const hour = new Date(view.enteredAt).getHours();
          if (!hourlyEngagement[hour]) {
            hourlyEngagement[hour] = {
              count: 0,
              totalTimeSpent: 0
            };
          }
          
          hourlyEngagement[hour].count++;
          hourlyEngagement[hour].totalTimeSpent += view.timeSpent;
        });
        
        // Find hour with highest engagement (time spent)
        let bestHour = 0;
        let maxEngagement = 0;
        
        for (const [hour, data] of Object.entries(hourlyEngagement)) {
          const avgTimeSpent = data.totalTimeSpent / data.count;
          if (avgTimeSpent > maxEngagement && data.count >= 5) {
            maxEngagement = avgTimeSpent;
            bestHour = parseInt(hour);
          }
        }
        
        // Convert hour to time period
        let timePeriod = '';
        if (bestHour >= 5 && bestHour < 12) {
          timePeriod = 'morning';
        } else if (bestHour >= 12 && bestHour < 17) {
          timePeriod = 'afternoon';
        } else if (bestHour >= 17 && bestHour < 22) {
          timePeriod = 'evening';
        } else {
          timePeriod = 'night';
        }
        
        // If best hour doesn't match preferred study time
        if (userData.learningPatterns && 
            userData.learningPatterns.preferredStudyTime !== 'unknown' &&
            userData.learningPatterns.preferredStudyTime !== timePeriod) {
          
          notifications.push({
            type: 'insight',
            message: `Your data shows you're most productive during the ${timePeriod}, but you typically study in the ${userData.learningPatterns.preferredStudyTime}. Consider adjusting your schedule.`,
            createdAt: new Date(),
            priority: 'low',
            actionRequired: false,
            actionLink: '/settings/learning-preferences'
          });
        }
      }
    } catch (error) {
      console.error('Error generating time management suggestions:', error);
    }
  }

  /**
   * Generate difficulty adjustment suggestions
   */
  static async generateDifficultyAdjustmentSuggestions(userData, userCourses, notifications) {
    try {
      // Check if user has difficulty ratings
      const coursesWithDifficulty = userCourses.filter(uc => 
        uc.difficultyRating && uc.difficultyRating !== 'not_rated'
      );
      
      if (coursesWithDifficulty.length === 0) return;
      
      // Count difficulty ratings
      const difficultyCounts = {
        too_easy: 0,
        just_right: 0,
        challenging: 0,
        too_difficult: 0
      };
      
      coursesWithDifficulty.forEach(uc => {
        difficultyCounts[uc.difficultyRating]++;
      });
      
      // If multiple courses are too easy
      if (difficultyCounts.too_easy > 1) {
        notifications.push({
          type: 'recommendation',
          message: `You've rated multiple courses as too easy. Explore our advanced courses to find more challenging content.`,
          createdAt: new Date(),
          priority: 'medium',
          actionRequired: false,
          actionLink: '/courses?difficulty=advanced'
        });
      }
      
      // If multiple courses are too difficult
      if (difficultyCounts.too_difficult > 1) {
        notifications.push({
          type: 'recommendation',
          message: `You seem to find several courses too challenging. We've highlighted some beginner-friendly options for you.`,
          createdAt: new Date(),
          priority: 'medium',
          actionRequired: false,
          actionLink: '/courses?difficulty=beginner'
        });
      }
      
      // Check for struggling courses (low progress, high difficulty)
      const strugglingCourses = userCourses.filter(uc => 
        uc.progress < 30 && 
        uc.difficultyRating === 'too_difficult' &&
        new Date(uc.lastAccessed) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Accessed in last 14 days
      );
      
      if (strugglingCourses.length > 0) {
        const course = strugglingCourses[0];
        
        notifications.push({
          type: 'support',
          message: `We noticed you're finding "${course.course.title}" challenging. Would you like to see supplementary resources?`,
          createdAt: new Date(),
          relatedCourse: course.course._id,
          priority: 'high',
          actionRequired: true,
          actionLink: `/courses/${course.course._id}/resources`
        });
      }
    } catch (error) {
      console.error('Error generating difficulty adjustment suggestions:', error);
    }
  }

  /**
   * Generate personalized AI suggestions based on user activity data
   * @param {Object} userData - User data object
   * @param {Array} notifications - Array of notification objects
   */
  static async generateAISuggestions(userData, notifications) {
    try {
      // Get user courses
      const userCourses = await UserCourse.find({ user: userData.user }).populate('course');
      
      // Check for inactive courses that user hasn't completed
      const inactiveCourses = userCourses.filter(uc => {
        const lastAccessed = new Date(uc.lastAccessed);
        const daysSinceLastAccess = Math.floor((Date.now() - lastAccessed) / (1000 * 60 * 60 * 24));
        return daysSinceLastAccess > 7 && uc.progress < 100 && uc.progress > 0;
      });
      
      if (inactiveCourses.length > 0) {
        // Sort by most progress to prioritize nearly completed courses
        inactiveCourses.sort((a, b) => b.progress - a.progress);
        const course = inactiveCourses[0];
        
        notifications.push({
          type: 'ai_suggestion',
          message: `You're ${course.progress}% through "${course.course.title}". Just a few more lessons to complete it!`,
          relatedCourse: course.course._id,
          actionUrl: `/courses/${course.course._id}`
        });
      }
      
      // Check for learning pattern insights
      if (userData.learningPatterns) {
        const { preferredStudyTime, consistencyScore } = userData.learningPatterns;
        
        // Suggest study time optimization
        if (preferredStudyTime && consistencyScore < 60) {
          notifications.push({
            type: 'ai_suggestion',
            message: `Based on your activity, you seem to learn best during ${preferredStudyTime}. Try scheduling more study sessions during this time.`,
            actionUrl: '/dashboard'
          });
        }
        
        // Check study habits
        if (userData.learningPatterns.studyHabits) {
          const { continuousSessions, breakFrequency, multitasking } = userData.learningPatterns.studyHabits;
          
          // Suggest breaks if user studies for long periods without breaks
          if (continuousSessions && breakFrequency < 1) {
            notifications.push({
              type: 'ai_suggestion',
              message: 'Taking short breaks during study sessions can improve retention. Try the Pomodoro technique: 25 minutes of focus followed by a 5-minute break.',
              actionUrl: null
            });
          }
          
          // Suggest focus techniques if user multitasks
          if (multitasking) {
            notifications.push({
              type: 'ai_suggestion',
              message: 'Multitasking can reduce learning effectiveness. Try focusing on one course at a time for better results.',
              actionUrl: null
            });
          }
        }
      }
      
      // Check for courses that match user interests but haven't been started
      if (userData.interests && userData.interests.length > 0) {
        const allCourses = await Course.find({});
        
        // Find courses that match user interests
        const matchingCourses = allCourses.filter(course => {
          // Check if course tags/categories match user interests
          return userData.interests.some(interest => 
            course.tags && course.tags.includes(interest)
          );
        });
        
        // Filter out courses user is already enrolled in
        const enrolledCourseIds = userCourses.map(uc => uc.course._id.toString());
        const recommendedCourses = matchingCourses.filter(course => 
          !enrolledCourseIds.includes(course._id.toString())
        );
        
        if (recommendedCourses.length > 0) {
          // Get a random course from the recommendations
          const randomIndex = Math.floor(Math.random() * recommendedCourses.length);
          const recommendedCourse = recommendedCourses[randomIndex];
          
          notifications.push({
            type: 'ai_suggestion',
            message: `Based on your interests, you might enjoy "${recommendedCourse.title}". Check it out!`,
            relatedCourse: recommendedCourse._id,
            actionUrl: `/courses/${recommendedCourse._id}`
          });
        }
      }
      
      // Check for quiz performance patterns
      if (userData.quizResults && userData.quizResults.length > 0) {
        // Calculate average score
        const averageScore = userData.quizResults.reduce((sum, result) => sum + result.score, 0) / userData.quizResults.length;
        
        // If average score is below 70%, suggest study tips
        if (averageScore < 70) {
          notifications.push({
            type: 'ai_suggestion',
            message: 'Your quiz scores suggest you might benefit from reviewing material before taking quizzes. Try summarizing key points in your own words.',
            actionUrl: null
          });
        }
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }
  }
}

module.exports = NotificationService;
