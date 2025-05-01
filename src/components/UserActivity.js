import React, { useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';
import AuthContext from '../context/AuthContext';
import OfflineContext from '../context/OfflineContext';

const UserActivity = () => {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { currentUser } = useContext(AuthContext);
  const { isOnline } = useContext(OfflineContext);
  
  useEffect(() => {
    if (currentUser && isOnline) {
      fetchActivityData();
    } else {
      setLoading(false);
    }
  }, [currentUser, isOnline]);
  
  const fetchActivityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userAPI.getUserActivity();
      setActivityData(response);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setError('Failed to load activity data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  };
  
  // Calculate time between dates
  const getTimeBetween = (date1, date2) => {
    if (!date1 || !date2) return 'N/A';
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = Math.abs(d2 - d1);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day';
    } else {
      return `${diffDays} days`;
    }
  };
  
  if (loading) return <div className="loading">Loading activity data...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!isOnline) return <div className="offline-message">Activity data is not available offline.</div>;
  if (!activityData) return <div className="no-data">No activity data available.</div>;
  
  return (
    <div className="user-activity">
      <h2>Your Learning Activity</h2>
      
      <div className="activity-summary">
        <div className="activity-stat">
          <h3>Last Login</h3>
          <p>{formatDate(activityData.lastLogin)}</p>
        </div>
        
        <div className="activity-stat">
          <h3>Previous Login</h3>
          <p>{formatDate(activityData.previousLogin)}</p>
        </div>
        
        <div className="activity-stat">
          <h3>Time Between Logins</h3>
          <p>{getTimeBetween(activityData.lastLogin, activityData.previousLogin)}</p>
        </div>
        
        <div className="activity-stat">
          <h3>Total Sessions</h3>
          <p>{activityData.totalSessions}</p>
        </div>
        
        <div className="activity-stat">
          <h3>Average Session</h3>
          <p>{formatDuration(activityData.averageSessionDuration)}</p>
        </div>
      </div>
      
      <h3>Recent Sessions</h3>
      {activityData.loginHistory && activityData.loginHistory.length > 0 ? (
        <div className="session-history">
          <table className="session-table">
            <thead>
              <tr>
                <th>Login Time</th>
                <th>Logout Time</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {activityData.loginHistory.slice(0, 5).map((session, index) => (
                <tr key={index}>
                  <td>{formatDate(session.loginTime)}</td>
                  <td>{session.logoutTime ? formatDate(session.logoutTime) : 'Active'}</td>
                  <td>{session.sessionDuration ? formatDuration(session.sessionDuration) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No session history available.</p>
      )}
    </div>
  );
};

export default UserActivity;
