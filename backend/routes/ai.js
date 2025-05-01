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
    const { prompt, courseId, courseTitle } = req.body;
    
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
    } else if (courseTitle) {
      // If only course title is provided (e.g. from offline mode)
      courseContext = `Course Title: ${courseTitle}\n`;
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

// @route   GET /api/ai/course-summary/:courseId
// @desc    Get AI-generated course summary
// @access  Private
router.get('/course-summary/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }
    
    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Create a prompt for the course summary
    let courseContext = `Course Title: ${course.title}\nDescription: ${course.description}\n`;
    
    // Add lesson information
    if (course.lessons && course.lessons.length > 0) {
      courseContext += 'Lessons:\n';
      course.lessons.forEach((lesson, index) => {
        courseContext += `${index + 1}. ${lesson.title}: ${lesson.description || 'No description'}\n`;
      });
    }
    
    // Create the prompt for Gemini
    const prompt = `
Please create a concise summary of this course based on the following information:

${courseContext}

The summary should:
1. Be 2-3 sentences long
2. Highlight the key topics covered
3. Mention the main skills or knowledge students will gain
4. Be engaging and informative

SUMMARY:`;
    
    // Get response from AI service
    const summary = await aiService.getAIResponse(prompt);
    
    // Return the summary
    res.json({ 
      summary,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('AI course summary error:', error);
    res.status(500).json({ 
      message: 'Error generating course summary',
      error: error.message
    });
  }
});

// @route   GET /api/ai/popup-question
// @desc    Get personalized AI popup question
// @access  Private
router.get('/popup-question', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Generate personalized question
    const question = await aiService.generatePersonalizedQuestion(userId);
    
    res.json(question);
  } catch (error) {
    console.error('AI popup question error:', error);
    res.status(500).json({ 
      message: 'Error generating AI popup question',
      error: error.message
    });
  }
});

// @route   POST /api/ai/popup-response
// @desc    Submit response to AI popup question and get feedback
// @access  Private
router.post('/popup-response', auth, async (req, res) => {
  try {
    const { questionId, response } = req.body;
    const userId = req.user._id;
    
    if (!questionId || !response) {
      return res.status(400).json({ message: 'Question ID and response are required' });
    }
    
    // Generate feedback for the response
    const feedback = await aiService.generateResponseFeedback(questionId, response, userId);
    
    res.json(feedback);
  } catch (error) {
    console.error('AI popup response error:', error);
    res.status(500).json({ 
      message: 'Error generating feedback for your response',
      error: error.message
    });
  }
});

// @route   GET /api/ai/personalized-tips
// @desc    Get personalized learning tips
// @access  Private
router.get('/personalized-tips', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Generate personalized tips
    const tips = await aiService.generatePersonalizedTips(userId);
    
    res.json(tips);
  } catch (error) {
    console.error('AI personalized tips error:', error);
    res.status(500).json({ 
      message: 'Error generating personalized tips',
      error: error.message
    });
  }
});

// @route   GET /api/ai/study-recommendations
// @desc    Get study recommendations based on user activity
// @access  Private
router.get('/study-recommendations', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Create a prompt for study recommendations
    const prompt = `
Generate 3 concise, actionable study recommendations for an e-learning platform user. 
These should be general best practices for effective online learning that apply to any subject.
Each recommendation should be 1-2 sentences long and practical.

RECOMMENDATIONS:`;
    
    // Get response from AI service
    const recommendationsText = await aiService.getAIResponse(prompt);
    
    // Parse recommendations (assuming they're numbered or bulleted)
    const recommendations = recommendationsText
      .split(/\d+\.\s|\n-\s|\n•\s/)
      .map(rec => rec.trim())
      .filter(rec => rec.length > 0)
      .slice(0, 3); // Ensure we only get 3 recommendations
    
    res.json({ 
      recommendations,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('AI study recommendations error:', error);
    res.status(500).json({ 
      message: 'Error generating study recommendations',
      error: error.message
    });
  }
});

// @route   GET /api/ai/learning-plan/:courseId
// @desc    Get personalized learning plan for a course
// @access  Private
router.get('/learning-plan/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;
    
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }
    
    // Generate learning plan
    const learningPlan = await aiService.generateLearningPlan(userId, courseId);
    
    res.json(learningPlan);
  } catch (error) {
    console.error('AI learning plan error:', error);
    res.status(500).json({ 
      message: 'Error generating learning plan',
      error: error.message
    });
  }
});

module.exports = router;
