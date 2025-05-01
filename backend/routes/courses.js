const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const UserCourse = require('../models/UserCourse');
const auth = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().select('-lessons.content');
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/:id/download
// @desc    Mark a course as downloaded for a user
// @access  Private
router.post('/:id/download', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user already has this course
    let userCourse = await UserCourse.findOne({
      user: req.user._id,
      course: course._id
    });
    
    if (userCourse) {
      // Update existing record
      userCourse.downloaded = true;
      userCourse.lastAccessed = Date.now();
      await userCourse.save();
    } else {
      // Create new record
      userCourse = new UserCourse({
        user: req.user._id,
        course: course._id,
        downloaded: true,
        completedLessons: [],
        progress: 0
      });
      await userCourse.save();
      
      // Add points to user for downloading a course
      req.user.points += 10;
      await req.user.save();
    }
    
    res.json({ message: 'Course marked as downloaded', userCourse });
  } catch (error) {
    console.error('Download course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/:id/complete-lesson
// @desc    Mark a lesson as completed for a user
// @access  Private
router.post('/:id/complete-lesson', auth, async (req, res) => {
  try {
    const { lessonOrder } = req.body;
    
    if (lessonOrder === undefined) {
      return res.status(400).json({ message: 'Lesson order is required' });
    }
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if lesson exists in the course
    if (!course.lessons[lessonOrder]) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Find or create user course record
    let userCourse = await UserCourse.findOne({
      user: req.user._id,
      course: course._id
    });
    
    if (!userCourse) {
      userCourse = new UserCourse({
        user: req.user._id,
        course: course._id,
        completedLessons: [],
        progress: 0
      });
    }
    
    // Check if lesson is already completed
    if (!userCourse.completedLessons.includes(lessonOrder)) {
      userCourse.completedLessons.push(lessonOrder);
      userCourse.lastAccessed = Date.now();
      
      // Calculate progress percentage
      userCourse.progress = Math.round((userCourse.completedLessons.length / course.lessons.length) * 100);
      
      await userCourse.save();
      
      // Update user streak and points
      req.user.points += 5;
      
      // Check if user was active today already
      const today = new Date();
      const lastActive = new Date(req.user.lastActive);
      
      if (today.getDate() !== lastActive.getDate() || 
          today.getMonth() !== lastActive.getMonth() || 
          today.getFullYear() !== lastActive.getFullYear()) {
        // New day, increment streak
        req.user.streakCount += 1;
      }
      
      req.user.lastActive = Date.now();
      await req.user.save();
    }
    
    res.json({
      message: 'Lesson marked as completed',
      completedLessons: userCourse.completedLessons,
      progress: userCourse.progress,
      streakCount: req.user.streakCount,
      points: req.user.points
    });
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/user/downloaded
// @desc    Get all downloaded courses for a user
// @access  Private
router.get('/user/downloaded', auth, async (req, res) => {
  try {
    const userCourses = await UserCourse.find({
      user: req.user._id,
      downloaded: true
    }).populate('course', '-lessons.content');
    
    const downloadedCourses = userCourses.map(uc => ({
      ...uc.course.toObject(),
      progress: uc.progress,
      completedLessons: uc.completedLessons,
      lastAccessed: uc.lastAccessed
    }));
    
    res.json(downloadedCourses);
  } catch (error) {
    console.error('Get downloaded courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
