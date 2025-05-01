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
// @desc    Get user's login activity and session history
// @access  Private
router.get('/activity', auth, async (req, res) => {
  try {
    // Find user data
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (!userData) {
      return res.json({
        lastLogin: null,
        previousLogin: null,
        loginHistory: [],
        totalSessions: 0,
        averageSessionDuration: 0
      });
    }
    
    // Calculate average session duration
    const completedSessions = userData.loginHistory.filter(session => session.logoutTime);
    const totalDuration = completedSessions.reduce((sum, session) => sum + session.sessionDuration, 0);
    const averageSessionDuration = completedSessions.length > 0 
      ? Math.floor(totalDuration / completedSessions.length) 
      : 0;
    
    res.json({
      lastLogin: userData.lastLogin,
      previousLogin: userData.previousLogin,
      loginHistory: userData.loginHistory.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime)),
      totalSessions: userData.loginHistory.length,
      averageSessionDuration
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
