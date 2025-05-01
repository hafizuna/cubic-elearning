const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyAoyeA7HuzNHn8wbWAGf88E9yTFEMKKezQ';
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

module.exports = {
  getAIResponse
};
