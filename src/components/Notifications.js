import React, { useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';
import { showNotification } from './NotificationManager';
import AuthContext from '../context/AuthContext';
import OfflineContext from '../context/OfflineContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { currentUser } = useContext(AuthContext);
  const { isOnline } = useContext(OfflineContext);
  
  // Fetch notifications when component mounts or when online status changes
  useEffect(() => {
    if (currentUser && isOnline) {
      fetchNotifications();
    }
  }, [currentUser, isOnline]);
  
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getNotifications();
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
    
    // If opening notifications and there are unread ones, mark them as read
    if (!isOpen && unreadCount > 0) {
      markAsRead();
    }
  };
  
  const markAsRead = async () => {
    try {
      // Get IDs of unread notifications
      const unreadIds = notifications
        .filter(notification => !notification.read)
        .map(notification => notification._id);
      
      if (unreadIds.length === 0) return;
      
      // Mark as read in the backend
      const response = await userAPI.markNotificationsAsRead(unreadIds);
      
      // Update local state
      setUnreadCount(response.unreadCount);
      setNotifications(prev => 
        prev.map(notification => 
          unreadIds.includes(notification._id) 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'login':
        return '👋';
      case 'course_completion':
        return '📚';
      case 'inactivity':
        return '⏰';
      case 'achievement':
        return '🏆';
      case 'system':
        return '🔔';
      default:
        return '📌';
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="notifications-container">
      <button 
        className="notification-bell" 
        onClick={toggleNotifications}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="close-button">×</button>
          </div>
          
          {loading ? (
            <div className="notifications-loading">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="no-notifications">No notifications yet</div>
          ) : (
            <ul className="notifications-list">
              {notifications.map(notification => (
                <li 
                  key={notification._id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-time">{formatDate(notification.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
