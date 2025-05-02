import React, { useState, useEffect } from 'react';
import './DiscountPopup.css';

const DiscountPopup = ({ show, onClose, discountAmount = 30 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const displayDuration = 15000; // 15 seconds
  const progressInterval = 100; // Update progress every 100ms
  
  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setProgress(100);
      
      // Start the progress bar countdown
      const totalSteps = displayDuration / progressInterval;
      const decrementAmount = 100 / totalSteps;
      
      const timer = setInterval(() => {
        setProgress(prevProgress => {
          const newProgress = prevProgress - decrementAmount;
          if (newProgress <= 0) {
            clearInterval(timer);
            setTimeout(() => {
              setIsVisible(false);
              if (onClose) onClose();
            }, 300); // Allow time for fade-out animation
            return 0;
          }
          return newProgress;
        });
      }, progressInterval);
      
      return () => {
        clearInterval(timer);
      };
    } else {
      setIsVisible(false);
    }
  }, [show, onClose]);
  
  if (!isVisible) return null;
  
  return (
    <div className="discount-popup-overlay">
      <div className="discount-popup">
        <div className="discount-popup-header">
          <div className="discount-popup-title">
            <span className="discount-icon">🎉</span> Congratulations!
          </div>
          <button className="discount-popup-close" onClick={onClose}>×</button>
        </div>
        
        <div className="discount-popup-content">
          <div className="discount-popup-badge">
            {discountAmount}%
          </div>
          
          <div className="discount-popup-message">
            <h2>You've earned a discount!</h2>
            <p>You now have a <strong>{discountAmount}% discount</strong> on your next course purchase.</p>
            <p className="discount-popup-warning">
              <span className="warning-icon">⚠️</span> Important: This discount will decrease by 1% each day you don't engage with your current course.
            </p>
            <p>Stay active to maintain your full discount!</p>
          </div>
        </div>
        
        <div className="discount-popup-footer">
          <button className="discount-popup-button" onClick={onClose}>
            Got it!
          </button>
        </div>
        
        <div className="discount-popup-progress-container">
          <div 
            className="discount-popup-progress" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default DiscountPopup;
