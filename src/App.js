import { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import NetworkStatus from './components/NetworkStatus';
import NotificationManager, { showNotification } from './components/NotificationManager';
import AdminRoute from './components/AdminRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseForm from './pages/admin/CourseForm';
import LessonManager from './pages/admin/LessonManager';

// Context
import AuthContext, { AuthProvider } from './context/AuthContext';
import OfflineContext, { OfflineProvider } from './context/OfflineContext';

// API Services
import { coursesAPI, userAPI } from './services/api';

function AppContent() {
  const [streakCount, setStreakCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  const { currentUser, loading } = useContext(AuthContext);
  const { isOnline, offlineCourses, downloadCourse, completeLesson } = useContext(OfflineContext);

  // This effect is now handled by OfflineContext
  
  // Fetch user data when user is authenticated
  useEffect(() => {
    if (currentUser) {
      // Fetch user profile data
      const fetchUserData = async () => {
        try {
          const response = await userAPI.getProfile();
          setStreakCount(response.user.streakCount);
          setPoints(response.user.points);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
      // Downloaded courses are now managed by OfflineContext
    }
  }, [currentUser]);
  
  // Fetch all courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const coursesData = await coursesAPI.getAllCourses();
        setCourses(coursesData);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    
    fetchCourses();
  }, []);

  // These functions are now handled by OfflineContext
  
  // Show achievement notifications for milestone streaks based on current streak
  const checkAchievements = () => {
    if (streakCount === 3) {
      setTimeout(() => {
        showNotification('Achievement Unlocked: 3-Day Streak!', 'achievement');
      }, 1500);
    } else if (streakCount === 7) {
      setTimeout(() => {
        showNotification('Achievement Unlocked: 7-Day Streak!', 'achievement');
      }, 1500);
    } else if (streakCount === 30) {
      setTimeout(() => {
        showNotification('Achievement Unlocked: 30-Day Streak! You\'re on fire!', 'achievement');
      }, 1500);
    }
    // Show achievement notifications for milestone points
    if (points >= 50 && points < 60) {
      setTimeout(() => {
        showNotification('Achievement Unlocked: 50+ Points!', 'achievement');
      }, 2000);
    } else if (points >= 100 && points < 110) {
      setTimeout(() => {
        showNotification('Achievement Unlocked: 100+ Points!', 'achievement');
      }, 2000);
    }
  };

  // Check achievements when streak count changes
  useEffect(() => {
    if (streakCount > 0) {
      checkAchievements();
    }
  }, [streakCount]);

  // Check if user is authenticated
  const isAuthenticated = !!currentUser;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <div className="app">
      <NotificationManager />
      <div className="app-content">
        <NetworkStatus isOnline={isOnline} />
        {currentUser && <Header streakCount={streakCount} points={points} />}
      
        <main className={`main-content ${!currentUser ? 'auth-main' : ''}`}>
        <Routes>
          <Route path="/login" element={
            !currentUser ? <Login /> : <Navigate to="/" />
          } />
          <Route path="/register" element={
            !currentUser ? <Register /> : <Navigate to="/" />
          } />
          <Route path="/" element={
            currentUser ? (
              <Dashboard />
            ) : <Navigate to="/login" />
          } />
          <Route path="/courses" element={
            currentUser ? (
              <Courses />
            ) : <Navigate to="/login" />
          } />
          <Route path="/courses/:id" element={
            currentUser ? (
              <CourseDetail />
            ) : <Navigate to="/login" />
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/courses/new" element={
            <AdminRoute>
              <CourseForm />
            </AdminRoute>
          } />
          <Route path="/admin/courses/:id" element={
            <AdminRoute>
              <CourseForm />
            </AdminRoute>
          } />
          <Route path="/admin/courses/:courseId/lessons" element={
            <AdminRoute>
              <LessonManager />
            </AdminRoute>
          } />
        </Routes>
        </main>
      
        {currentUser && <Footer />}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <OfflineProvider>
          <AppContent />
        </OfflineProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
