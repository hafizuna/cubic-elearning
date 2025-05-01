import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { usersAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [achievements, setAchievements] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile data
        const profileResponse = await usersAPI.getProfile();
        setUserProfile(profileResponse.user);
        
        // Fetch user stats
        const statsResponse = await usersAPI.getProgress();
        setUserStats(statsResponse.data);
        
        // Fetch achievements
        const achievementsResponse = await usersAPI.getAchievements();
        setAchievements(achievementsResponse.achievements || []);
        
        // Fetch enrolled courses
        const coursesResponse = await usersAPI.getEnrolledCourses();
        setEnrolledCourses(coursesResponse.courses || []);
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Set demo data if API fails
        setUserProfile({
          name: currentUser?.name || 'John Doe',
          email: currentUser?.email || 'john.doe@example.com',
          role: currentUser?.role || 'student',
          bio: 'Passionate learner and technology enthusiast.',
          joinDate: '2024-01-15T00:00:00.000Z',
          profileImage: null
        });
        
        setUserStats({
          streak: 5,
          points: 1250,
          level: 3,
          levelProgress: 65,
          completedCourses: 4,
          totalCourses: 12,
          totalLessonsCompleted: 27,
          totalQuizzesCompleted: 8,
          averageQuizScore: 85
        });
        
        setAchievements([
          { id: '1', name: 'Fast Learner', description: 'Complete 3 lessons in one day', icon: '🚀', earnedAt: '2025-04-15T00:00:00.000Z' },
          { id: '2', name: 'Quiz Master', description: 'Score 100% on 3 quizzes', icon: '🏆', earnedAt: '2025-04-20T00:00:00.000Z' },
          { id: '3', name: 'Consistent Learner', description: 'Maintain a 5-day streak', icon: '🔥', earnedAt: '2025-04-28T00:00:00.000Z' }
        ]);
        
        setEnrolledCourses([
          { id: '1', title: 'JavaScript Basics', progress: 100, completedAt: '2025-04-10T00:00:00.000Z', thumbnail: '/images/courses/javascript.jpg' },
          { id: '2', title: 'React Fundamentals', progress: 75, completedAt: null, thumbnail: '/images/courses/react.jpg' },
          { id: '3', title: 'CSS Masterclass', progress: 40, completedAt: null, thumbnail: '/images/courses/css.jpg' },
          { id: '4', title: 'Python for Beginners', progress: 100, completedAt: '2025-04-25T00:00:00.000Z', thumbnail: '/images/courses/python.jpg' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate time since joined
  const calculateTimeSince = (dateString) => {
    const joinDate = new Date(dateString);
    const now = new Date();
    const diffInMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    
    if (diffInMonths < 1) {
      const diffInDays = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
      return `${diffInDays} days`;
    } else if (diffInMonths < 12) {
      return `${diffInMonths} months`;
    } else {
      const years = Math.floor(diffInMonths / 12);
      const months = diffInMonths % 12;
      return months > 0 ? `${years} years, ${months} months` : `${years} years`;
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!userProfile || !userProfile.name) return '?';
    return userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar-large">
            {userProfile.profileImage ? (
              <img src={userProfile.profileImage} alt={userProfile.name} />
            ) : (
              <div className="profile-initials">{getUserInitials()}</div>
            )}
          </div>
          <div className="profile-info">
            <h1>{userProfile.name}</h1>
            <p className="profile-role">{userProfile.role}</p>
            <p className="profile-bio">{userProfile.bio}</p>
            <div className="profile-meta">
              <div className="profile-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Joined {formatDate(userProfile.joinDate)}</span>
              </div>
              <div className="profile-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Member for {calculateTimeSince(userProfile.joinDate)}</span>
              </div>
              <div className="profile-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{userProfile.email}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-stats">
          <div className="profile-stat-card">
            <div className="profile-stat-value">{userStats.level}</div>
            <div className="profile-stat-label">Level</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">{userStats.points.toLocaleString()}</div>
            <div className="profile-stat-label">Points</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">{userStats.streak}</div>
            <div className="profile-stat-label">Day Streak</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">{userStats.completedCourses}</div>
            <div className="profile-stat-label">Courses Completed</div>
          </div>
        </div>
      </div>
      
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`profile-tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Courses
        </button>
        <button 
          className={`profile-tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </button>
        <button 
          className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      
      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="profile-overview">
            <div className="profile-section">
              <h2>Learning Progress</h2>
              <div className="profile-progress-cards">
                <div className="profile-progress-card">
                  <div className="progress-circle">
                    <svg viewBox="0 0 36 36">
                      <path
                        className="progress-circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="progress-circle-fill"
                        strokeDasharray={`${userStats.levelProgress}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="progress-circle-text">{userStats.levelProgress}%</text>
                    </svg>
                  </div>
                  <div className="progress-info">
                    <h3>Level Progress</h3>
                    <p>{userStats.levelProgress}% to Level {userStats.level + 1}</p>
                  </div>
                </div>
                
                <div className="profile-progress-card">
                  <div className="progress-circle">
                    <svg viewBox="0 0 36 36">
                      <path
                        className="progress-circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="progress-circle-fill"
                        strokeDasharray={`${(userStats.completedCourses / userStats.totalCourses) * 100}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="progress-circle-text">{userStats.completedCourses}/{userStats.totalCourses}</text>
                    </svg>
                  </div>
                  <div className="progress-info">
                    <h3>Courses Completed</h3>
                    <p>{Math.round((userStats.completedCourses / userStats.totalCourses) * 100)}% of enrolled courses</p>
                  </div>
                </div>
                
                <div className="profile-progress-card">
                  <div className="progress-circle">
                    <svg viewBox="0 0 36 36">
                      <path
                        className="progress-circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="progress-circle-fill quiz-score"
                        strokeDasharray={`${userStats.averageQuizScore}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="progress-circle-text">{userStats.averageQuizScore}%</text>
                    </svg>
                  </div>
                  <div className="progress-info">
                    <h3>Quiz Performance</h3>
                    <p>{userStats.averageQuizScore}% average score</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="profile-section">
              <h2>Recent Activity</h2>
              <div className="recent-activity">
                <div className="activity-item">
                  <div className="activity-icon completed">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="activity-content">
                    <h3>Completed Course</h3>
                    <p>You completed "JavaScript Basics"</p>
                    <span className="activity-time">2 days ago</span>
                  </div>
                </div>
                
                <div className="activity-item">
                  <div className="activity-icon achievement">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                  </div>
                  <div className="activity-content">
                    <h3>Achievement Unlocked</h3>
                    <p>You earned the "Consistent Learner" badge</p>
                    <span className="activity-time">4 days ago</span>
                  </div>
                </div>
                
                <div className="activity-item">
                  <div className="activity-icon quiz">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="activity-content">
                    <h3>Quiz Completed</h3>
                    <p>You scored 90% on "React Components Quiz"</p>
                    <span className="activity-time">1 week ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'courses' && (
          <div className="profile-courses">
            <h2>My Courses</h2>
            <div className="courses-grid">
              {enrolledCourses.map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-thumbnail">
                    <img src={course.thumbnail || '/images/default-course.jpg'} alt={course.title} onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%234a6cf7" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="white">Course Image</text></svg>';
                    }} />
                    <div className="course-progress-bar">
                      <div className="course-progress-fill" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <div className="course-meta">
                      <span className="course-progress">{course.progress}% complete</span>
                      {course.completedAt && (
                        <span className="course-completed">Completed on {formatDate(course.completedAt)}</span>
                      )}
                    </div>
                    <Link to={`/courses/${course.id}`} className="course-continue-btn">
                      {course.progress === 100 ? 'Review Course' : 'Continue Learning'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="courses-cta">
              <Link to="/courses" className="browse-courses-btn">
                Browse More Courses
              </Link>
            </div>
          </div>
        )}
        
        {activeTab === 'achievements' && (
          <div className="profile-achievements">
            <h2>My Achievements</h2>
            <div className="achievements-grid">
              {achievements.map(achievement => (
                <div key={achievement.id} className="achievement-card">
                  <div className="achievement-icon">
                    <span>{achievement.icon}</span>
                  </div>
                  <div className="achievement-info">
                    <h3>{achievement.name}</h3>
                    <p>{achievement.description}</p>
                    <span className="achievement-date">Earned on {formatDate(achievement.earnedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="profile-settings">
            <h2>Account Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input type="text" id="name" defaultValue={userProfile.name} />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" defaultValue={userProfile.email} />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea id="bio" rows="4" defaultValue={userProfile.bio}></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="profileImage">Profile Image</label>
                <div className="profile-image-upload">
                  <div className="current-image">
                    {userProfile.profileImage ? (
                      <img src={userProfile.profileImage} alt={userProfile.name} />
                    ) : (
                      <div className="profile-initials">{getUserInitials()}</div>
                    )}
                  </div>
                  <div className="upload-controls">
                    <button className="upload-btn">Upload New Image</button>
                    <button className="remove-btn">Remove Image</button>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <button className="change-password-btn">Change Password</button>
              </div>
              
              <div className="form-actions">
                <button className="save-settings-btn">Save Changes</button>
                <button className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
