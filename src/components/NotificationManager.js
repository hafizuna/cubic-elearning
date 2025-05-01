import React, { useState, useEffect } from 'react';
import Notification from './Notification';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  
  // Listen for custom events to show notifications
  useEffect(() => {
    const handleNotification = (event) => {
      const { message, type } = event.detail;
      addNotification(message, type);
    };
    
    window.addEventListener('show-notification', handleNotification);
    
    return () => {
      window.removeEventListener('show-notification', handleNotification);
    };
  }, []);
  
  const addNotification = (message, type) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

// Helper function to trigger notifications from anywhere in the app
export const showNotification = (message, type) => {
  const event = new CustomEvent('show-notification', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
};

export default NotificationManager;
