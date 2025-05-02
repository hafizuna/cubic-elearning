const User = require('../models/User');
const UserData = require('../models/UserData');
const NotificationService = require('./notificationService');

/**
 * Service for handling scheduled tasks
 */
class ScheduledTasks {
  /**
   * Run all scheduled tasks
   */
  static async runAll() {
    try {
      console.log('Running scheduled tasks...');
      await this.generatePersonalizedNotifications();
      await this.updateLearningPatterns();
      await this.checkInactivity();
      console.log('Scheduled tasks completed');
    } catch (error) {
      console.error('Error running scheduled tasks:', error);
    }
  }

  /**
   * Generate personalized notifications for all users
   */
  static async generatePersonalizedNotifications() {
    try {
      console.log('Generating personalized notifications...');
      
      // Get all users
      const users = await User.find({});
      let notificationCount = 0;
      
      // Generate notifications for each user
      for (const user of users) {
        const notifications = await NotificationService.generatePersonalizedNotifications(user._id);
        notificationCount += notifications.length;
      }
      
      console.log(`Generated ${notificationCount} personalized notifications`);
    } catch (error) {
      console.error('Error generating personalized notifications:', error);
    }
  }

  /**
   * Update learning patterns for all users
   */
  static async updateLearningPatterns() {
    try {
      console.log('Updating learning patterns...');
      
      // Get all user data
      const allUserData = await UserData.find({});
      
      // Update learning patterns for each user
      for (const userData of allUserData) {
        // Skip if patterns were updated in the last 24 hours
        const lastCalculated = userData.learningPatterns?.lastCalculated;
        if (lastCalculated && (new Date() - new Date(lastCalculated)) < (24 * 60 * 60 * 1000)) {
          continue;
        }
        
        // Initialize learning patterns if needed
        if (!userData.learningPatterns) {
          userData.learningPatterns = {
            preferredStudyTime: 'unknown',
            averageSessionDuration: 0,
            mostActiveDay: 'unknown',
            consistencyScore: 0,
            lastCalculated: new Date()
          };
        }
        
        // Calculate average session duration
        if (userData.loginHistory && userData.loginHistory.length > 0) {
          const completedSessions = userData.loginHistory.filter(session => 
            session.logoutTime && session.sessionDuration > 0
          );
          
          if (completedSessions.length > 0) {
            const totalDuration = completedSessions.reduce(
              (sum, session) => sum + session.sessionDuration, 0
            );
            userData.learningPatterns.averageSessionDuration = totalDuration / completedSessions.length;
          }
        }
        
        // Determine preferred study time and most active day
        const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
        const dayOfWeekCounts = { 
          sunday: 0, monday: 0, tuesday: 0, wednesday: 0, 
          thursday: 0, friday: 0, saturday: 0 
        };
        
        // Analyze page views from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentPageViews = userData.pageViews?.filter(
          view => new Date(view.enteredAt) > thirtyDaysAgo
        ) || [];
        
        recentPageViews.forEach(view => {
          const date = new Date(view.enteredAt);
          const hour = date.getHours();
          const day = date.getDay();
          
          // Determine time of day
          if (hour >= 5 && hour < 12) timeOfDayCounts.morning++;
          else if (hour >= 12 && hour < 17) timeOfDayCounts.afternoon++;
          else if (hour >= 17 && hour < 22) timeOfDayCounts.evening++;
          else timeOfDayCounts.night++;
          
          // Determine day of week
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          dayOfWeekCounts[days[day]]++;
        });
        
        // Set preferred study time
        let maxTime = 'unknown';
        let maxTimeCount = 0;
        for (const [time, count] of Object.entries(timeOfDayCounts)) {
          if (count > maxTimeCount) {
            maxTime = time;
            maxTimeCount = count;
          }
        }
        if (maxTimeCount > 0) {
          userData.learningPatterns.preferredStudyTime = maxTime;
        }
        
        // Set most active day
        let maxDay = 'unknown';
        let maxDayCount = 0;
        for (const [day, count] of Object.entries(dayOfWeekCounts)) {
          if (count > maxDayCount) {
            maxDay = day;
            maxDayCount = count;
          }
        }
        if (maxDayCount > 0) {
          userData.learningPatterns.mostActiveDay = maxDay;
        }
        
        // Calculate consistency score (0-100)
        if (userData.loginHistory?.length > 0) {
          // Get login dates for the last 30 days
          const recentLogins = userData.loginHistory
            .filter(login => new Date(login.loginTime) > thirtyDaysAgo)
            .map(login => {
              const date = new Date(login.loginTime);
              return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            });
          
          // Count unique days logged in
          const uniqueDaysLoggedIn = new Set(recentLogins).size;
          
          // Calculate consistency score
          const frequencyScore = (uniqueDaysLoggedIn / 30) * 60;
          const durationScore = Math.min(userData.learningPatterns.averageSessionDuration / 60, 1) * 40;
          
          userData.learningPatterns.consistencyScore = frequencyScore + durationScore;
        }
        
        // Update last calculated timestamp
        userData.learningPatterns.lastCalculated = new Date();
        
        // Save changes
        await userData.save();
      }
      
      console.log('Learning patterns updated');
    } catch (error) {
      console.error('Error updating learning patterns:', error);
    }
  }

  /**
   * Check for user inactivity and generate notifications
   */
  static async checkInactivity() {
    try {
      console.log('Checking for user inactivity...');
      
      // Get all user data
      const allUserData = await UserData.find({});
      
      // Check inactivity for each user
      for (const userData of allUserData) {
        const now = new Date();
        const lastActive = userData.lastLogin;
        
        // If last activity was more than 3 days ago, check for inactivity period
        if (lastActive && (now - new Date(lastActive)) > (3 * 24 * 60 * 60 * 1000)) {
          // Check if we already have an open inactivity period
          let currentInactivityPeriod = null;
          
          if (userData.inactivityPeriods && userData.inactivityPeriods.length > 0) {
            currentInactivityPeriod = userData.inactivityPeriods[userData.inactivityPeriods.length - 1];
            
            // If the last period is still open, update it
            if (currentInactivityPeriod && !currentInactivityPeriod.endDate) {
              currentInactivityPeriod.duration = Math.floor((now - new Date(currentInactivityPeriod.startDate)) / (24 * 60 * 60 * 1000));
              
              // Create inactivity notification if not already sent and it's been 7 days
              if (!currentInactivityPeriod.notified && currentInactivityPeriod.duration >= 7) {
                userData.notifications.push({
                  type: 'inactivity',
                  message: `We miss you! It's been ${currentInactivityPeriod.duration} days since your last visit. Come back and continue your learning journey!`,
                  createdAt: now,
                  priority: 'high',
                  actionRequired: true,
                  actionLink: '/courses'
                });
                
                currentInactivityPeriod.notified = true;
              }
            }
          } else {
            // Create a new inactivity period
            userData.inactivityPeriods.push({
              startDate: lastActive,
              duration: Math.floor((now - new Date(lastActive)) / (24 * 60 * 60 * 1000))
            });
          }
          
          // Save changes
          await userData.save();
        }
      }
      
      console.log('Inactivity check completed');
    } catch (error) {
      console.error('Error checking for inactivity:', error);
    }
  }
}

module.exports = ScheduledTasks;
