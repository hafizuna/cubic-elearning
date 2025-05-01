const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserCourse = require('../models/UserCourse');
const UserData = require('../models/UserData');
const auth = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get user profile with streak and points
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    // Get user data
    const user = await User.findById(req.user._id).select('-password');
    
    // Get user's downloaded courses count
    const downloadedCoursesCount = await UserCourse.countDocuments({
      user: req.user._id,
      downloaded: true
    });
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        streakCount: user.streakCount,
        points: user.points,
        lastActive: user.lastActive,
        createdAt: user.createdAt,
        downloadedCoursesCount
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Update user
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    
    await user.save();
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        streakCount: user.streakCount,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/progress
// @desc    Get user's learning progress across all courses
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    // Get all user courses
    const userCourses = await UserCourse.find({
      user: req.user._id
    }).populate('course', 'title image');
    
    const progress = userCourses.map(uc => ({
      courseId: uc.course._id,
      title: uc.course.title,
      image: uc.course.image,
      progress: uc.progress,
      completedLessons: uc.completedLessons,
      downloaded: uc.downloaded,
      lastAccessed: uc.lastAccessed
    }));
    
    res.json({
      progress,
      streakCount: req.user.streakCount,
      points: req.user.points
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/notifications', auth, async (req, res) => {
  try {
    // Find or create user data
    let userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      userData = new UserData({
        user: req.user._id,
        lastLogin: Date.now(),
        notifications: []
      });
      await userData.save();
    }
    
    // Return notifications sorted by creation date (newest first)
    const notifications = userData.notifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.json({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/notifications/read
// @desc    Mark notifications as read
// @access  Private
router.put('/notifications/read', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Notification IDs are required' });
    }
    
    // Find user data
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Mark specified notifications as read
    userData.notifications.forEach(notification => {
      if (notificationIds.includes(notification._id.toString())) {
        notification.read = true;
      }
    });
    
    await userData.save();
    
    res.json({
      success: true,
      unreadCount: userData.notifications.filter(n => !n.read).length
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/activity
// @desc    Get user activity data
// @access  Private
router.get('/activity', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Format the response to include only necessary data
    const activityData = {
      loginHistory: userData.loginHistory,
      learningPatterns: userData.learningPatterns || {},
      courseEngagement: userData.courseEngagement || [],
      pageViewsCount: userData.pageViews ? userData.pageViews.length : 0,
      lastLogin: userData.lastLogin,
      previousLogin: userData.previousLogin
    };
    
    res.json(activityData);
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id })
      .populate('notifications.relatedCourse', 'title thumbnail');
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Sort notifications by date (newest first) and limit to 50
    const notifications = userData.notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Find the notification by ID
    const notification = userData.notifications.id(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Mark as read
    notification.read = true;
    await userData.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Mark all as read
    userData.notifications.forEach(notification => {
      notification.read = true;
    });
    
    await userData.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/notifications/:id', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Find and remove the notification
    const notification = userData.notifications.id(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.remove();
    await userData.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/notification-preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/notification-preferences', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Return notification preferences or default values
    const preferences = userData.notificationPreferences || {
      email: {
        enabled: true,
        frequency: 'daily'
      },
      inApp: {
        enabled: true,
        types: {
          achievement: true,
          courseCompletion: true,
          inactivity: true,
          recommendation: true,
          streak: true
        }
      }
    };
    
    res.json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/notification-preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/notification-preferences', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Update preferences
    userData.notificationPreferences = req.body;
    await userData.save();
    
    res.json({ success: true, preferences: userData.notificationPreferences });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/learning-patterns
// @desc    Get user learning patterns
// @access  Private
router.get('/learning-patterns', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }
    
    // Return learning patterns or default values
    const learningPatterns = userData.learningPatterns || {
      preferredStudyTime: 'unknown',
      averageSessionDuration: 0,
      mostActiveDay: 'unknown',
      consistencyScore: 0,
      lastCalculated: null
    };
    
    res.json(learningPatterns);
  } catch (error) {
    console.error('Error getting learning patterns:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/generate-personalized-notifications
// @desc    Generate personalized notifications for the user
// @access  Private
router.get('/generate-personalized-notifications', auth, async (req, res) => {
  try {
    const NotificationService = require('../services/notificationService');
    const notifications = await NotificationService.generatePersonalizedNotifications(req.user._id);
    
    res.json({ 
      success: true, 
      message: `Generated ${notifications.length} personalized notifications`,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error generating personalized notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/track-page-view
// @desc    Track a page view
// @access  Private
router.post('/track-page-view', auth, async (req, res) => {
  try {
    const { page, courseId, timeSpent } = req.body;
    
    if (!page) {
      return res.status(400).json({ message: 'Page is required' });
    }
    
    let userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      userData = new UserData({
        user: req.user._id,
        lastLogin: Date.now(),
        pageViews: []
      });
    }
    
    // Close any open page views
    if (userData.pageViews && userData.pageViews.length > 0) {
      const lastPageView = userData.pageViews[userData.pageViews.length - 1];
      if (lastPageView && !lastPageView.exitedAt) {
        lastPageView.exitedAt = new Date();
        lastPageView.timeSpent = Math.floor((lastPageView.exitedAt - lastPageView.enteredAt) / 1000);
      }
    }
    
    // Add new page view
    userData.pageViews.push({
      page,
      course: courseId || null,
      enteredAt: new Date()
    });
    
    await userData.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/exit-page
// @desc    Track when a user exits a page
// @access  Private
router.post('/exit-page', auth, async (req, res) => {
  try {
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData || !userData.pageViews || userData.pageViews.length === 0) {
      return res.status(404).json({ message: 'No active page view found' });
    }
    
    // Close the last page view
    const lastPageView = userData.pageViews[userData.pageViews.length - 1];
    if (!lastPageView.exitedAt) {
      lastPageView.exitedAt = new Date();
      lastPageView.timeSpent = Math.floor((lastPageView.exitedAt - lastPageView.enteredAt) / 1000);
      
      await userData.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking page exit:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
