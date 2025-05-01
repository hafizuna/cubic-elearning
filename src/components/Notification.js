import React, { useState, useEffect } from 'react';

const Notification = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`notification ${type} ${visible ? 'show' : 'hide'}`}>
      <div className="notification-content">
        {type === 'achievement' && <div className="notification-icon">🏆</div>}
        {type === 'streak' && <div className="notification-icon">🔥</div>}
        {type === 'points' && <div className="notification-icon">⭐</div>}
        {type === 'download' && <div className="notification-icon">📲</div>}
        <div className="notification-message">{message}</div>
      </div>
    </div>
  );
};

export default Notification;
