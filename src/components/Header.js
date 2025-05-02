import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Header.css';
import { AuthContext } from '../context/AuthContext';
import { showNotification } from '../components/NotificationManager';
import { usersAPI } from '../services/api';

const Header = ({ streakCount: propStreakCount, points: propPoints }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsList, setShowNotificationsList] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userStats, setUserStats] = useState({ 
    streak: propStreakCount || 0, 
    points: propPoints || 0, 
    level: 1, 
    progress: 0 
  });
  const [currentTime, setCurrentTime] = useState('');
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Update userStats when props change
  useEffect(() => {
    if (propPoints !== undefined) {
      setUserStats(prevStats => ({
        ...prevStats,
        points: propPoints
      }));
    }
    
    if (propStreakCount !== undefined) {
      setUserStats(prevStats => ({
        ...prevStats,
        streak: propStreakCount
      }));
    }
  }, [propPoints, propStreakCount]);

  useEffect(() => {
    // Fetch user stats
    const fetchUserStats = async () => {
      try {
        const response = await usersAPI.getProgress();
        if (response && response.data) {
          setUserStats({
            streak: propStreakCount !== undefined ? propStreakCount : response.data.streak || 0,
            points: propPoints !== undefined ? propPoints : response.data.points || 0,
            level: response.data.level || 1,
            progress: response.data.levelProgress || 0,
            completedCourses: response.data.completedCourses || 0,
            totalCourses: response.data.totalCourses || 0
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
        // Set some default values for demo purposes
        setUserStats({
          streak: propStreakCount !== undefined ? propStreakCount : 5,
          points: propPoints !== undefined ? propPoints : 1250,
          level: 3,
          progress: 65,
          completedCourses: 4,
          totalCourses: 12
        });
      }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const response = await usersAPI.getNotifications();
        if (response && response.data && response.data.notifications) {
          setNotifications(response.data.notifications);
          
          // Count unread notifications
          const unread = response.data.notifications.filter(notification => !notification.read).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Set some sample notifications for demo purposes
        const sampleNotifications = [
          {
            _id: '1',
            type: 'course_completion',
            message: 'Congratulations! You completed the JavaScript Basics course.',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
          },
          {
            _id: '2',
            type: 'achievement',
            message: 'You earned the "Fast Learner" badge for completing 3 lessons in one day!',
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2 hours ago
          },
          {
            _id: '3',
            type: 'login',
            message: 'Welcome back! You\'ve maintained a 5-day streak.',
            read: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
          }
        ];
        setNotifications(sampleNotifications);
        setUnreadCount(2);
      }
    };

    if (currentUser) {
      fetchUserStats();
      fetchNotifications();
    }

    // Set up click outside listener
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotificationsList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentUser, propPoints, propStreakCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
    // Close notifications if open
    if (showNotificationsList) setShowNotificationsList(false);
  };

  const toggleNotifications = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowNotificationsList(!showNotificationsList);
    // Close profile menu if open
    if (showProfileMenu) setShowProfileMenu(false);
  };

  const markNotificationAsRead = async (id) => {
    try {
      await usersAPI.markNotificationAsRead(id);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === id ? { ...notification, read: true } : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await usersAPI.markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark as read if not already read
    if (!notification.read) {
      markNotificationAsRead(notification._id);
    }
    
    // Handle navigation based on notification type
    if (notification.relatedCourse) {
      navigate(`/courses/${notification.relatedCourse}`);
    }
    
    // Close the notifications menu
    setShowNotificationsList(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser || !currentUser.name) return '?';
    return currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'login':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case 'course_completion':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'achievement':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'inactivity':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <header className="header">
      <div className="header-brand">
        <Link to="/" className="header-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Cubic E-Learning
        </Link>
      </div>
      
      <div className="header-content">
        <nav className="main-nav">
          <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
            Dashboard
          </NavLink>
          <NavLink to="/courses" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            Courses
          </NavLink>
          {currentUser && currentUser.role === 'admin' && (
            <NavLink to="/admin" className={({isActive}) => isActive ? "nav-link active admin-link" : "nav-link admin-link"}>
              Admin
            </NavLink>
          )}
        </nav>
        
        {currentUser && (
          <div className="user-actions">
            <div className="time-display">
              {currentTime}
            </div>
            
            <div className="user-stats">
              <div className="user-level">
                <div className="level-badge">
                  <span>{userStats.level}</span>
                </div>
                <div className="level-progress">
                  <div className="level-progress-bar">
                    <div className="level-progress-fill" style={{ width: `${userStats.progress}%` }}></div>
                  </div>
                  <span className="level-text">Level {userStats.level}</span>
                </div>
              </div>
              
              <div className="stat-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 16l-5-5 1.41-1.41L12 13.17l3.59-3.58L17 11l-5 5z" />
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                <span>{userStats.streak} day streak</span>
              </div>
              
              <div className="stat-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                <span>{userStats.points.toLocaleString()} points</span>
              </div>
              
              <div className="stat-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>{userStats.completedCourses}/{userStats.totalCourses} courses</span>
              </div>
            </div>
            
            <div className="notifications-center" ref={notificationsRef}>
              <button className="notification-button" onClick={toggleNotifications} aria-label="Notifications">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              
              {showNotificationsList && (
                <div className="notifications-panel">
                  <div className="notifications-panel-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <button className="read-all-button" onClick={markAllAsRead}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="notifications-panel-content">
                    {notifications.length === 0 ? (
                      <div className="empty-notifications">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No notifications yet</p>
                        <span>We'll notify you when something important happens</span>
                      </div>
                    ) : (
                      <div className="notifications-list">
                        {notifications.map(notification => (
                          <div 
                            key={notification._id} 
                            className={`notification-card ${notification.read ? '' : 'unread'}`}
                            onClick={(e) => handleNotificationClick(notification, e)}
                          >
                            <div className="notification-card-icon">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="notification-card-content">
                              <p className="notification-card-message">{notification.message}</p>
                              <span className="notification-card-time">{getTimeAgo(notification.createdAt)}</span>
                            </div>
                            {!notification.read && <div className="notification-card-indicator"></div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="notifications-panel-footer">
                    <Link to="/notifications" onClick={() => setShowNotificationsList(false)}>
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <div className="profile-dropdown" ref={profileRef}>
              <div className="profile-button" onClick={toggleProfileMenu}>
                <div className="profile-avatar">
                  {currentUser.profileImage ? (
                    <img src={currentUser.profileImage} alt={currentUser.name} />
                  ) : (
                    getUserInitials()
                  )}
                </div>
                <div className="profile-info">
                  <span className="profile-name">{currentUser.name}</span>
                  <span className="profile-role">{currentUser.role}</span>
                </div>
              </div>
              
              {showProfileMenu && (
                <div className="dropdown-menu active">
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <Link to="/settings" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
