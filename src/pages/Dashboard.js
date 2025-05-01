import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../services/api';
import OfflineContext from '../context/OfflineContext';
import AuthContext from '../context/AuthContext';
import UserActivity from '../components/UserActivity';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [streakCount, setStreakCount] = useState(0);
  const [points, setPoints] = useState(0);
  
  // Use the offline and auth contexts
  const { offlineCourses } = useContext(OfflineContext);
  const { currentUser } = useContext(AuthContext);
  
  // Fetch user progress data from the API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile for streak and points
        if (currentUser) {
          const profileData = await usersAPI.getProfile();
          setStreakCount(profileData.user.streakCount);
          setPoints(profileData.user.points);
        }
        
        // Fetch user progress
        const progressData = await usersAPI.getProgress();
        setUserProgress(progressData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [currentUser]);
  
  return (
    <div className="dashboard">
      <h1>Your Learning Dashboard</h1>
      
      <div className="stats-container">
        <div className="card stat-card">
          <div className="stat-value">{streakCount}</div>
          <div className="stat-label">Day Streak</div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${Math.min(streakCount * 10, 100)}%` }}></div>
          </div>
          <p>Keep learning daily to increase your streak!</p>
        </div>
        
        <div className="card stat-card">
          <div className="stat-value">{points}</div>
          <div className="stat-label">Total Points</div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${Math.min(points / 2, 100)}%` }}></div>
          </div>
          <p>Earn points by completing lessons and downloading courses</p>
        </div>
        
        <div className="card stat-card">
          <div className="stat-value">{offlineCourses.length}</div>
          <div className="stat-label">Offline Courses</div>
          <p>Courses available for offline learning</p>
        </div>
      </div>
      
      <div className="card">
        <h2 className="card-title">Your Offline Courses</h2>
        
        {offlineCourses.length > 0 ? (
          <div className="courses-grid">
            {offlineCourses.map((course) => (
              <Link to={`/courses/${course._id}`} key={course._id} className="course-card">
                <img src={course.image || `https://via.placeholder.com/300x160?text=${encodeURIComponent(course.title)}`} alt={course.title} />
                <div className="course-info">
                  <h3>{course.title}</h3>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${course.progress || 0}%` }}></div>
                  </div>
                  <div className="progress-text">{course.progress || 0}% complete</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't downloaded any courses for offline learning yet.</p>
            <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
          </div>
        )}
      </div>
      
      {/* User Activity Card */}
      <div className="card">
        <UserActivity />
      </div>
      
      <div className="card">
        <h2 className="card-title">Your Achievements</h2>
        <div className="achievements-list">
          {streakCount >= 1 && (
            <div className="badge badge-streak achievement-pop">First Day Streak</div>
          )}
          {streakCount >= 3 && (
            <div className="badge badge-streak">3-Day Streak</div>
          )}
          {streakCount >= 7 && (
            <div className="badge badge-streak">7-Day Streak</div>
          )}
          {points >= 10 && (
            <div className="badge badge-points">10+ Points</div>
          )}
          {points >= 50 && (
            <div className="badge badge-points">50+ Points</div>
          )}
          {offlineCourses.length >= 1 && (
            <div className="badge badge-streak">First Download</div>
          )}
        </div>
      </div>
      
      <Link to="/courses" className="btn btn-primary">Browse All Courses</Link>
    </div>
  );
};

export default Dashboard;
