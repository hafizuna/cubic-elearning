import React, { useState, useEffect, useContext } from 'react';
import { usersAPI } from '../services/api';
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
      const response = await usersAPI.getNotifications();
      // Ensure notifications is always an array
      const notificationsArray = Array.isArray(response) ? response : [];
      setNotifications(notificationsArray);
      setUnreadCount(notificationsArray.filter(notification => !notification.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
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
      await usersAPI.markAllNotificationsAsRead();
      
      // Update local state to mark all as read
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
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
      case 'streak':
        return '🔥';
      case 'milestone':
        return '🎯';
      case 'recommendation':
        return '💡';
      case 'reminder':
        return '🔔';
      case 'system':
      default:
        return '📌';
    }
  };
  
  return (
    <div className="notifications-container">
      <button 
        className="notification-toggle" 
        onClick={toggleNotifications}
        aria-label="Notifications"
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className="mark-all-read" 
                onClick={markAsRead}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {loading ? (
              <div className="notification-loading">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">No notifications yet</div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={index} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatDate(notification.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Overlay to close notifications when clicking outside */}
      {isOpen && (
        <div className="notifications-overlay" onClick={toggleNotifications}></div>
      )}
    </div>
  );
};

export default Notifications;
