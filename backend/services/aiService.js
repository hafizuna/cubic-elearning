const axios = require('axios');
const UserData = require('../models/UserData');
const UserCourse = require('../models/UserCourse');
const User = require('../models/User');

const GEMINI_API_KEY = 'AIzaSyD6FKiDF6AcG669bc68jNLdPS6MzEpCTBI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Get AI response from Gemini API
 * @param {string} prompt - The user's question or prompt
 * @param {string} courseContext - Optional context about the course to help with relevant answers
 * @returns {Promise<string>} - The AI response text
 */
const getAIResponse = async (prompt, courseContext = '') => {
  try {
    // Combine the course context with the user's prompt for better relevance
    const fullPrompt = courseContext 
      ? `Context about this course: ${courseContext}\n\nStudent question: ${prompt}`
      : prompt;
    
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract the text response from Gemini
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts) {
      
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Invalid response structure from Gemini API');
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    throw new Error(`AI Assistant error: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * Generate a personalized question for the user based on their activity data
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The personalized question object
 */
const generatePersonalizedQuestion = async (userId) => {
  try {
    // Get user data
    const userData = await UserData.findOne({ user: userId });
    const userCourses = await UserCourse.find({ user: userId }).populate('course');
    const userProfile = await User.findById(userId);
    
    if (!userData || !userProfile) {
      return generateDefaultQuestion();
    }
    
    // Build context about the user for Gemini
    let userContext = `The user is a student on an e-learning platform. Here's information about their learning patterns and activity:\n`;
    
    // Add learning patterns
    if (userData.learningPatterns) {
      const { preferredStudyTime, mostActiveDay, learningPace, consistencyScore } = userData.learningPatterns;
      
      userContext += `- Preferred study time: ${preferredStudyTime}\n`;
      userContext += `- Most active day: ${mostActiveDay}\n`;
      userContext += `- Learning pace: ${learningPace}\n`;
      userContext += `- Consistency score: ${consistencyScore}/100\n`;
      
      // Add preferred content types if available
      if (userData.learningPatterns.preferredContentTypes) {
        const types = Object.entries(userData.learningPatterns.preferredContentTypes)
          .sort(([, a], [, b]) => b - a)
          .map(([type, score]) => `${type} (${score}%)`)
          .join(', ');
        
        userContext += `- Preferred content types: ${types}\n`;
      }
    }
    
    // Add course information
    if (userCourses && userCourses.length > 0) {
      userContext += `\nCourses in progress:\n`;
      
      userCourses
        .filter(uc => uc.progress > 0 && uc.progress < 100)
        .sort((a, b) => b.lastAccessed - a.lastAccessed)
        .slice(0, 3)
        .forEach(uc => {
          userContext += `- "${uc.course.title}" (${uc.progress}% complete)\n`;
        });
      
      // Add recently completed courses
      const completedCourses = userCourses.filter(uc => uc.progress === 100);
      if (completedCourses.length > 0) {
        userContext += `\nRecently completed courses:\n`;
        completedCourses
          .sort((a, b) => b.lastAccessed - a.lastAccessed)
          .slice(0, 2)
          .forEach(uc => {
            userContext += `- "${uc.course.title}"\n`;
          });
      }
    }
    
    // Add streak information
    userContext += `\nCurrent learning streak: ${userProfile.streakCount} days\n`;
    
    // Add inactivity information
    if (userData.inactivityPeriods && userData.inactivityPeriods.length > 0) {
      const recentInactivity = userData.inactivityPeriods
        .filter(period => period.endDate) // Only include completed periods
        .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
      
      if (recentInactivity) {
        userContext += `\nRecently had an inactivity period of ${recentInactivity.duration} days\n`;
      }
    }
    
    // Generate a question prompt for Gemini
    const questionPrompt = `
Based on the following information about an e-learning platform user, generate a personalized, engaging question that will help them reflect on their learning journey, set goals, or improve their study habits. The question should be conversational, friendly, and specific to their data.

${userContext}

Generate a single, thoughtful question (max 2-3 sentences) that feels personalized based on their data. Do not mention specific numbers from their data, but use the insights to craft a relevant question. The question should encourage reflection and be answerable in a few sentences.

QUESTION:`;
    
    // Get response from Gemini
    const questionText = await getAIResponse(questionPrompt);
    
    // Create a unique ID for this question
    const questionId = `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    return {
      id: questionId,
      question: questionText.trim(),
      timestamp: new Date(),
      userId: userId,
      context: {
        learningPace: userData.learningPatterns?.learningPace || 'unknown',
        consistencyScore: userData.learningPatterns?.consistencyScore || 0,
        streakCount: userProfile.streakCount || 0,
        activeCourses: userCourses.filter(uc => uc.progress > 0 && uc.progress < 100).length
      }
    };
  } catch (error) {
    console.error('Error generating personalized question:', error);
    return generateDefaultQuestion();
  }
};

/**
 * Generate a default question when user data is not available
 * @returns {Object} - A default question object
 */
const generateDefaultQuestion = () => {
  const defaultQuestions = [
    "What learning goal are you most excited to achieve in the next month?",
    "What's been your biggest challenge in online learning so far?",
    "How do you stay motivated when studying difficult topics?",
    "What time of day do you find you're most productive for learning?",
    "What's one study habit you'd like to improve?",
    "What's the most interesting thing you've learned recently?",
    "How do you apply what you learn in these courses to your daily life?",
    "What helps you stay focused during your learning sessions?"
  ];
  
  const randomQuestion = defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];
  
  return {
    id: `q_default_${Date.now()}`,
    question: randomQuestion,
    timestamp: new Date(),
    isDefault: true
  };
};

/**
 * Generate feedback for a user's response to an AI question
 * @param {string} questionId - The ID of the question
 * @param {string} userResponse - The user's response text
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Feedback object
 */
const generateResponseFeedback = async (questionId, userResponse, userId) => {
  try {
    // Get user data for context
    const userData = await UserData.findOne({ user: userId });
    
    // Create a prompt for Gemini to generate feedback
    const feedbackPrompt = `
You are an AI learning assistant on an e-learning platform. A user has just responded to a reflective question.

QUESTION ID: ${questionId}
USER RESPONSE: "${userResponse}"

Generate a brief, encouraging, and thoughtful reply to their response. Your feedback should:
1. Acknowledge their response positively
2. Offer a small insight or suggestion related to their answer
3. End with an encouraging note about their learning journey
4. Be conversational and friendly
5. Be concise (2-3 sentences maximum)

FEEDBACK:`;
    
    // Get response from Gemini
    const feedbackText = await getAIResponse(feedbackPrompt);
    
    // Store this interaction in user data if available
    if (userData) {
      // Create a record of this interaction
      if (!userData.aiInteractions) {
        userData.aiInteractions = [];
      }
      
      userData.aiInteractions.push({
        questionId,
        question: questionId.startsWith('q_default_') ? 'Default question' : 'Personalized question',
        response: userResponse,
        feedback: feedbackText.trim(),
        timestamp: new Date()
      });
      
      await userData.save();
    }
    
    return {
      feedback: feedbackText.trim(),
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating response feedback:', error);
    return {
      feedback: "Thank you for sharing your thoughts! Your reflections help make your learning journey more effective. Keep up the great work!",
      timestamp: new Date()
    };
  }
};

/**
 * Generate personalized learning tips based on user data
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Personalized tips object
 */
const generatePersonalizedTips = async (userId) => {
  try {
    // Get user data
    const userData = await UserData.findOne({ user: userId });
    const userCourses = await UserCourse.find({ user: userId }).populate('course');
    
    if (!userData) {
      return { tips: getDefaultTips() };
    }
    
    // Build context about the user
    let userContext = `The user is a student on an e-learning platform. Here's information about their learning patterns and activity:\n`;
    
    // Add learning patterns
    if (userData.learningPatterns) {
      const { preferredStudyTime, learningPace, consistencyScore } = userData.learningPatterns;
      
      userContext += `- Preferred study time: ${preferredStudyTime}\n`;
      userContext += `- Learning pace: ${learningPace}\n`;
      userContext += `- Consistency score: ${consistencyScore}/100\n`;
      
      if (userData.learningPatterns.studyHabits) {
        const { continuousSessions, breakFrequency, multitasking } = userData.learningPatterns.studyHabits;
        
        userContext += `- Takes continuous study sessions: ${continuousSessions ? 'Yes' : 'No'}\n`;
        userContext += `- Break frequency: ${breakFrequency} breaks per hour\n`;
        userContext += `- Multitasks during learning: ${multitasking ? 'Yes' : 'No'}\n`;
      }
    }
    
    // Generate tips prompt for Gemini
    const tipsPrompt = `
Based on the following information about an e-learning platform user, generate 3 personalized learning tips that will help them improve their study habits and learning outcomes.

${userContext}

Generate 3 concise, actionable tips (1-2 sentences each) that are specifically tailored to their learning patterns. Each tip should be practical and immediately applicable.

TIPS:`;
    
    // Get response from Gemini
    const tipsText = await getAIResponse(tipsPrompt);
    
    // Parse tips (assuming they're numbered or bulleted)
    const tipsList = tipsText
      .split(/\d+\.\s|\n-\s|\n•\s/)
      .map(tip => tip.trim())
      .filter(tip => tip.length > 0)
      .slice(0, 3); // Ensure we only get 3 tips
    
    return {
      tips: tipsList,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating personalized tips:', error);
    return { tips: getDefaultTips() };
  }
};

/**
 * Get default learning tips
 * @returns {Array} - Array of default tips
 */
const getDefaultTips = () => {
  const defaultTips = [
    "Break your study sessions into 25-minute focused blocks with 5-minute breaks to maintain concentration.",
    "Review your notes within 24 hours of learning new material to significantly improve retention.",
    "Explain concepts out loud as if teaching someone else to deepen your understanding.",
    "Create visual summaries or mind maps to connect related concepts.",
    "Practice active recall by testing yourself rather than simply re-reading material.",
    "Study similar subjects in different locations to improve your ability to recall information in different contexts.",
    "Get 7-8 hours of sleep to allow your brain to consolidate what you've learned."
  ];
  
  // Return 3 random tips
  const shuffled = [...defaultTips].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

/**
 * Generate a personalized learning plan for a specific course
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Learning plan object
 */
const generateLearningPlan = async (userId, courseId) => {
  try {
    // Get user and course data
    const userData = await UserData.findOne({ user: userId });
    const userCourse = await UserCourse.findOne({ 
      user: userId, 
      course: courseId 
    }).populate('course');
    
    if (!userData || !userCourse) {
      return { 
        plan: "We couldn't generate a personalized learning plan at this time. Please try again later.",
        timestamp: new Date()
      };
    }
    
    // Build context about the user and course
    let context = `The user is taking the course "${userCourse.course.title}". Here's information about their progress and learning patterns:\n`;
    
    // Add course progress
    context += `- Current progress: ${userCourse.progress}%\n`;
    context += `- Last accessed: ${new Date(userCourse.lastAccessed).toLocaleDateString()}\n`;
    
    // Add learning patterns
    if (userData.learningPatterns) {
      context += `- Preferred study time: ${userData.learningPatterns.preferredStudyTime}\n`;
      context += `- Learning pace: ${userData.learningPatterns.learningPace}\n`;
      
      if (userData.learningPatterns.studyHabits) {
        context += `- Takes continuous study sessions: ${userData.learningPatterns.studyHabits.continuousSessions ? 'Yes' : 'No'}\n`;
      }
    }
    
    // Add course details
    context += `\nCourse information:\n`;
    context += `- Title: ${userCourse.course.title}\n`;
    context += `- Description: ${userCourse.course.description}\n`;
    context += `- Number of lessons: ${userCourse.course.lessons?.length || 0}\n`;
    
    // Add completed lessons
    if (userCourse.completedLessons && userCourse.completedLessons.length > 0) {
      context += `- Completed lessons: ${userCourse.completedLessons.length}\n`;
    }
    
    // Generate plan prompt for Gemini
    const planPrompt = `
Based on the following information about a student taking an online course, create a personalized learning plan to help them complete the course efficiently and effectively.

${context}

Create a concise learning plan that includes:
1. A suggested study schedule based on their patterns
2. Tips for approaching the remaining content
3. A strategy for completing the course that matches their learning pace
4. A realistic timeline for completion

The plan should be practical, motivating, and tailored to their specific situation.

LEARNING PLAN:`;
    
    // Get response from Gemini
    const planText = await getAIResponse(planPrompt);
    
    return {
      plan: planText.trim(),
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating learning plan:', error);
    return { 
      plan: "We couldn't generate a personalized learning plan at this time. Please try again later.",
      timestamp: new Date()
    };
  }
};

module.exports = {
  getAIResponse,
  generatePersonalizedQuestion,
  generateResponseFeedback,
  generatePersonalizedTips,
  generateLearningPlan
};
