import React, { useState, useEffect, useContext } from 'react';
import { aiAPI } from '../services/api';
import { showNotification } from './NotificationManager';
import OfflineContext from '../context/OfflineContext';

const AIAssistant = ({ courseId, courseTitle }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showAssistant, setShowAssistant] = useState(false);
  const [courseSummary, setCourseSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const { isOnline } = useContext(OfflineContext);
  
  // Get course summary when component mounts
  useEffect(() => {
    if (courseId && isOnline && showAssistant) {
      getCourseSummary();
    }
  }, [courseId, isOnline, showAssistant]);
  
  const getCourseSummary = async () => {
    try {
      setSummaryLoading(true);
      const result = await aiAPI.getCourseSummary(courseId);
      setCourseSummary(result.summary);
    } catch (error) {
      console.error('Error getting course summary:', error);
      // Don't show error for summary, just silently fail
    } finally {
      setSummaryLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      return;
    }
    
    if (!isOnline) {
      showNotification('AI Assistant is not available offline', 'download');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Add user message to chat history
      const userMessage = {
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, userMessage]);
      
      // Call AI API
      const result = await aiAPI.askQuestion(prompt, courseId);
      
      // Add AI response to chat history
      const aiMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: result.timestamp
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      setResponse(result.response);
      setPrompt('');
    } catch (error) {
      console.error('Error getting AI response:', error);
      setError('Failed to get a response from the AI assistant. Please try again later.');
      
      // Add error message to chat history
      const errorMessage = {
        role: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAssistant = () => {
    setShowAssistant(!showAssistant);
    // We're removing the body class to allow scrolling when assistant is open
  };
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Suggested questions based on course context
  const suggestedQuestions = [
    `What are the key concepts in ${courseTitle}?`,
    `Can you explain the most difficult topics in ${courseTitle}?`,
    `What skills will I learn from ${courseTitle}?`,
    `How can I apply what I learn in ${courseTitle} to real-world problems?`
  ];
  
  const handleSuggestedQuestion = (question) => {
    setPrompt(question);
  };
  
  return (
    <div className={`ai-assistant-sidebar ${showAssistant ? 'open' : ''}`}>
      <button 
        className="ai-assistant-toggle"
        onClick={toggleAssistant}
        aria-label={showAssistant ? "Close AI Assistant" : "Open AI Assistant"}
      >
        <span className="ai-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </span>
        <span className="ai-toggle-text">{showAssistant ? "Close Assistant" : "AI Learning Assistant"}</span>
      </button>
      
      <div className="ai-assistant-content">
        <div className="ai-assistant-header">
          <div className="ai-header-title">
            <span className="ai-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </span>
            <h3>Gemini AI Learning Assistant</h3>
          </div>
          <button onClick={toggleAssistant} className="close-button" aria-label="Close">×</button>
        </div>
        
        {courseSummary && (
          <div className="course-summary">
            <h4>Course Overview</h4>
            <p>{courseSummary}</p>
          </div>
        )}
        
        {summaryLoading && (
          <div className="summary-loading">Generating course overview...</div>
        )}
        
        <div className="chat-container">
          {chatHistory.length === 0 ? (
            <div className="welcome-message">
              <div className="welcome-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                </svg>
              </div>
              <h4>Your Personal Learning Assistant</h4>
              <p>I'm powered by Gemini 2.5 Flash and here to help you understand this course better.</p>
              <p>Ask me any questions about the material, concepts, or how to apply what you're learning.</p>
            </div>
          ) : (
            <div className="chat-messages">
              {chatHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.role === 'user' ? 'user-message' : message.role === 'assistant' ? 'ai-message' : 'system-message'}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? '👤' : message.role === 'assistant' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    ) : '⚠️'}
                  </div>
                  <div className="message-bubble">
                    <div className="message-content">
                      {message.content}
                    </div>
                    <div className="message-timestamp">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ai-thinking">
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Thinking...</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {chatHistory.length === 0 && (
          <div className="suggested-questions">
            <h4>Try asking about:</h4>
            <div className="question-buttons">
              {suggestedQuestions.map((question, index) => (
                <button 
                  key={index} 
                  className="suggested-question-btn"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="ai-form">
          <div className="input-container">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a question about this course..."
              disabled={loading || !isOnline}
              className="ai-input"
            />
            <button 
              type="submit" 
              disabled={loading || !prompt.trim() || !isOnline}
              className="ai-submit-btn"
              aria-label="Send question"
            >
              {loading ? '...' : '→'}
            </button>
          </div>
          
          {error && <div className="ai-error">{error}</div>}
          
          {!isOnline && (
            <div className="offline-message">
              AI Assistant is not available offline. Please connect to the internet to use this feature.
            </div>
          )}
          
          <div className="ai-powered-by">
            Powered by Gemini 2.5 Flash
          </div>
        </form>
      </div>
      
      {/* Overlay to close assistant when clicking outside on mobile */}
      {showAssistant && <div className="ai-overlay" onClick={toggleAssistant}></div>}
    </div>
  );
};

export default AIAssistant;
