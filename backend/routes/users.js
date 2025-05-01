const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserCourse = require('../models/UserCourse');
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

module.exports = router;
