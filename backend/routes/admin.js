const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { uploadCourseImage, uploadLessonVideo, cloudinary } = require('../config/cloudinary');

// Apply auth and admin middleware to all routes
router.use(auth);
router.use(admin);

/**
 * @route   GET /api/admin/courses
 * @desc    Get all courses (including unpublished) for admin
 * @access  Admin
 */
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find().populate('author', 'name email');
    res.json(courses);
  } catch (error) {
    console.error('Admin get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/courses
 * @desc    Create a new course
 * @access  Admin
 */
router.post('/courses', uploadCourseImage.single('image'), async (req, res) => {
  try {
    const { title, description, category, difficulty } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Create course with image if provided
    const courseData = {
      title,
      description,
      category: category || 'General',
      difficulty: difficulty || 'Beginner',
      author: req.user._id,
      lessons: [],
      published: false
    };
    
    // If image was uploaded, add the URL
    if (req.file) {
      courseData.image = req.file.path;
      courseData.imagePublicId = req.file.filename;
    } else {
      // Default placeholder image
      courseData.image = `https://via.placeholder.com/500x300?text=${encodeURIComponent(title)}`;
    }
    
    const course = new Course(courseData);
    await course.save();
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/courses/:id
 * @desc    Update a course
 * @access  Admin
 */
router.put('/courses/:id', uploadCourseImage.single('image'), async (req, res) => {
  try {
    const { title, description, category, difficulty, published } = req.body;
    
    // Find the course
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Update course fields
    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (difficulty) course.difficulty = difficulty;
    if (published !== undefined) course.published = published;
    
    // If new image was uploaded
    if (req.file) {
      // Delete old image if it exists and has a public ID
      if (course.imagePublicId) {
        await cloudinary.uploader.destroy(course.imagePublicId);
      }
      
      course.image = req.file.path;
      course.imagePublicId = req.file.filename;
    }
    
    course.updatedAt = Date.now();
    await course.save();
    
    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/courses/:id
 * @desc    Delete a course
 * @access  Admin
 */
router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Delete course image from Cloudinary if it exists
    if (course.imagePublicId) {
      await cloudinary.uploader.destroy(course.imagePublicId);
    }
    
    // Delete all lesson videos from Cloudinary
    for (const lesson of course.lessons) {
      if (lesson.videoPublicId) {
        await cloudinary.uploader.destroy(lesson.videoPublicId, { resource_type: 'video' });
      }
    }
    
    await course.remove();
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/courses/:id/lessons
 * @desc    Add a lesson to a course
 * @access  Admin
 */
router.post('/courses/:id/lessons', uploadLessonVideo.single('video'), async (req, res) => {
  try {
    const { title, description, content, order } = req.body;
    
    // Validate required fields
    if (!title || !content || !order) {
      return res.status(400).json({ message: 'Title, content, and order are required' });
    }
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Create new lesson
    const newLesson = {
      title,
      description: description || '',
      content,
      order: parseInt(order)
    };
    
    // If video was uploaded, add the URL and metadata
    if (req.file) {
      newLesson.videoUrl = req.file.path;
      newLesson.videoPublicId = req.file.filename;
      
      // In a real app, you would extract video duration here
      // For now, we'll set a default or mock value
      newLesson.duration = 300; // 5 minutes in seconds
    }
    
    // Add lesson to course
    course.lessons.push(newLesson);
    course.updatedAt = Date.now();
    
    // Sort lessons by order
    course.lessons.sort((a, b) => a.order - b.order);
    
    await course.save();
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Add lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/courses/:courseId/lessons/:lessonId
 * @desc    Update a lesson
 * @access  Admin
 */
router.put('/courses/:courseId/lessons/:lessonId', uploadLessonVideo.single('video'), async (req, res) => {
  try {
    const { title, description, content, order } = req.body;
    
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Find the lesson
    const lesson = course.lessons.id(req.params.lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Update lesson fields
    if (title) lesson.title = title;
    if (description !== undefined) lesson.description = description;
    if (content) lesson.content = content;
    if (order) lesson.order = parseInt(order);
    
    // If new video was uploaded
    if (req.file) {
      // Delete old video if it exists
      if (lesson.videoPublicId) {
        await cloudinary.uploader.destroy(lesson.videoPublicId, { resource_type: 'video' });
      }
      
      lesson.videoUrl = req.file.path;
      lesson.videoPublicId = req.file.filename;
      
      // In a real app, you would extract video duration here
      // For now, we'll set a default or mock value
      lesson.duration = 300; // 5 minutes in seconds
    }
    
    course.updatedAt = Date.now();
    
    // Sort lessons by order
    course.lessons.sort((a, b) => a.order - b.order);
    
    await course.save();
    
    res.json(course);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/courses/:courseId/lessons/:lessonId
 * @desc    Delete a lesson
 * @access  Admin
 */
router.delete('/courses/:courseId/lessons/:lessonId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Find the lesson
    const lesson = course.lessons.id(req.params.lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Delete video from Cloudinary if it exists
    if (lesson.videoPublicId) {
      await cloudinary.uploader.destroy(lesson.videoPublicId, { resource_type: 'video' });
    }
    
    // Remove lesson from course
    lesson.remove();
    course.updatedAt = Date.now();
    
    await course.save();
    
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
