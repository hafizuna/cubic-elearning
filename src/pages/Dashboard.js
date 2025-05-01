import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import OfflineContext from '../context/OfflineContext';
import { AuthContext } from '../context/AuthContext';
import { DiscountContext } from '../context/DiscountContext';
import DiscountMeter from '../components/DiscountMeter';
import DiscountBanner from '../components/DiscountBanner';
import '../components/DiscountMeter.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [streakCount, setStreakCount] = useState(0);
  const [points, setPoints] = useState(0);
  
  // Use the offline, auth, and discount contexts
  const { offlineCourses } = useContext(OfflineContext);
  const { currentUser } = useContext(AuthContext);
  const { discountStatus, fetchDiscountStatus } = useContext(DiscountContext);
  
  // Fetch user progress data from the API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile for streak and points
        if (currentUser) {
          const profileData = await userAPI.getProfile();
          setStreakCount(profileData.user.streakCount);
          setPoints(profileData.user.points);
          
          // Refresh discount status
          await fetchDiscountStatus();
        }
        
        // Fetch user progress
        const progressData = await userAPI.getProgress();
        setUserProgress(progressData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [currentUser, fetchDiscountStatus]);
  
  return (
    <div className="dashboard">
      <DiscountBanner />
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
          <div className="stat-label">Points</div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${Math.min(points / 10, 100)}%` }}></div>
          </div>
        </div>
        
        {/* Discount Card */}
        <div className="card stat-card discount-card">
          {discountStatus.loading ? (
            <div className="loading">Loading discount info...</div>
          ) : discountStatus.hasActiveDiscount ? (
            <DiscountMeter courseId={discountStatus.activeCourseDiscount?.courseId} />
          ) : discountStatus.nextCourseDiscount > 0 ? (
            <DiscountMeter />
          ) : (
            <div className="discount-info">
              <div className="stat-value">30%</div>
              <div className="stat-label">Potential Discount</div>
              <p className="discount-explainer">Start a course to earn up to 30% off your next purchase!</p>
            </div>
          )}
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
