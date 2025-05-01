const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const aiService = require('../services/aiService');

// @route   POST /api/ai/ask
// @desc    Get AI response to a question
// @access  Private
router.post('/ask', auth, async (req, res) => {
  try {
    const { prompt, courseId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    
    let courseContext = '';
    
    // If a course ID is provided, get course info to provide context
    if (courseId) {
      try {
        const course = await Course.findById(courseId);
        if (course) {
          // Create a context string with course details
          courseContext = `Course Title: ${course.title}\nDescription: ${course.description}\n`;
          
          // Add lesson titles for better context
          if (course.lessons && course.lessons.length > 0) {
            courseContext += 'Lessons: ' + course.lessons.map(lesson => lesson.title).join(', ');
          }
        }
      } catch (error) {
        console.error('Error fetching course for AI context:', error);
        // Continue without course context if there's an error
      }
    }
    
    // Get response from AI service
    const aiResponse = await aiService.getAIResponse(prompt, courseContext);
    
    // Return the AI response
    res.json({ 
      response: aiResponse,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ 
      message: 'Error getting AI response',
      error: error.message
    });
  }
});

// @route   POST /api/ai/course-summary
// @desc    Generate a course summary using AI
// @access  Private
router.post('/course-summary', auth, async (req, res) => {
  try {
    const { courseId } = req.body;
    
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }
    
    // Get course details
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Create a prompt for the AI to generate a summary
    let summaryPrompt = `Please create a concise summary of this course:\n\n`;
    summaryPrompt += `Title: ${course.title}\n`;
    summaryPrompt += `Description: ${course.description}\n`;
    
    if (course.lessons && course.lessons.length > 0) {
      summaryPrompt += `Lessons: ${course.lessons.map(lesson => lesson.title).join(', ')}\n\n`;
      summaryPrompt += `Please include key learning objectives and what students will gain from this course.`;
    }
    
    // Get response from AI service
    const aiResponse = await aiService.getAIResponse(summaryPrompt);
    
    // Return the AI response
    res.json({ 
      summary: aiResponse,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ 
      message: 'Error generating course summary',
      error: error.message
    });
  }
});

module.exports = router;
