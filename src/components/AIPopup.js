import React, { useState, useEffect, useContext, useRef } from 'react';
import { aiAPI } from '../services/api';
import AuthContext from '../context/AuthContext';
import OfflineContext from '../context/OfflineContext';
import './AIPopup.css';

const AIPopup = () => {
  const [isOpen, setIsOpen] = useState(true); 
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [popupTimer, setPopupTimer] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 80 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const { currentUser } = useContext(AuthContext);
  const { isOnline } = useContext(OfflineContext);
  const popupRef = useRef(null);
  
  useEffect(() => {
    if (popupRef.current) {
      pulseAnimation();
    }
    
    if (currentUser && isOnline) {
      const randomTime = Math.floor(Math.random() * (5 - 2 + 1) + 2) * 60 * 1000;
      const timer = setTimeout(() => {
        fetchPopupQuestion();
      }, randomTime);
      
      setPopupTimer(timer);
    }
    
    return () => {
      if (popupTimer) {
        clearTimeout(popupTimer);
      }
    };
  }, [currentUser, isOnline]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && popupRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - popupRef.current.offsetWidth;
        const maxY = window.innerHeight - popupRef.current.offsetHeight;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = 'auto';
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const pulseAnimation = () => {
    if (popupRef.current) {
      popupRef.current.classList.add('pulse-animation');
      setTimeout(() => {
        if (popupRef.current) {
          popupRef.current.classList.remove('pulse-animation');
        }
      }, 2000);
    }
  };
  
  const handleMouseDown = (e) => {
    if (popupRef.current && e.target.closest('.ai-popup-header')) {
      setIsDragging(true);
      document.body.style.userSelect = 'none';
      
      const rect = popupRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      
      e.preventDefault();
    }
  };
  
  const fetchPopupQuestion = async () => {
    try {
      setLoading(true);
      
      try {
        const result = await aiAPI.getAIPopupQuestion();
        if (result && result.question) {
          setQuestion(result);
          setIsExpanded(true);
          return;
        }
      } catch (error) {
        console.error('Error fetching AI popup question:', error);
      }
      
      setQuestion({
        id: 'default-question',
        question: 'What topic are you most interested in learning about today?'
      });
      setIsExpanded(true);
    } catch (error) {
      console.error('Error setting up AI popup:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!response.trim()) return;
    
    try {
      setLoading(true);
      
      try {
        const result = await aiAPI.submitAIPopupResponse(question.id, response);
        if (result && result.feedback) {
          setFeedback(result.feedback);
          setShowFeedback(true);
          return;
        }
      } catch (error) {
        console.error('Error submitting response:', error);
      }
      
      setFeedback("Thanks for sharing your thoughts! I'll use this to customize your learning experience.");
      setShowFeedback(true);
    } catch (error) {
      console.error('Error handling response:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleExpanded = () => {
    if (!isExpanded) {
      fetchPopupQuestion();
    }
    setIsExpanded(!isExpanded);
  };
  
  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false);
    setQuestion(null);
    setResponse('');
    setFeedback('');
    setShowFeedback(false);
    
    if (currentUser && isOnline) {
      const randomTime = Math.floor(Math.random() * (15 - 5 + 1) + 5) * 60 * 1000;
      const timer = setTimeout(() => {
        setIsOpen(true);
        pulseAnimation();
      }, randomTime);
      
      setPopupTimer(timer);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="ai-floating-container"
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
      }}
      ref={popupRef}
      onMouseDown={handleMouseDown}
    >
      <div className={`ai-popup ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="ai-popup-header">
          <div className="ai-popup-drag-handle">
            <div className="ai-avatar">
              <img src="/images/gemini-avatar.png" alt="Gemini AI" onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234a6cf7"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
              }} />
            </div>
            <h3>Gemini AI</h3>
          </div>
          <div className="ai-popup-controls">
            {isExpanded && (
              <button 
                className="minimize-button"
                onClick={toggleExpanded}
                aria-label="Minimize"
              >
                -
              </button>
            )}
            <button 
              className="close-button"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        
        {isExpanded ? (
          <div className="ai-popup-content">
            {!showFeedback ? (
              <>
                <div className="ai-popup-question">
                  <p>{question?.question || "How can I help you with your learning today?"}</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    disabled={loading}
                  ></textarea>
                  
                  <div className="ai-popup-actions">
                    <button 
                      type="button" 
                      className="secondary-button"
                      onClick={toggleExpanded}
                      disabled={loading}
                    >
                      Minimize
                    </button>
                    <button 
                      type="submit" 
                      className="primary-button"
                      disabled={loading || !response.trim()}
                    >
                      {loading ? 'Sending...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="ai-popup-feedback">
                <p>{feedback}</p>
                
                <button 
                  className="primary-button"
                  onClick={() => {
                    setShowFeedback(false);
                    setIsExpanded(false);
                  }}
                >
                  Continue Learning
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ai-popup-collapsed" onClick={toggleExpanded}>
            <span>Ask me anything!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPopup;
