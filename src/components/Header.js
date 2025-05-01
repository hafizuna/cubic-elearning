import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { showNotification } from './NotificationManager';

const Header = ({ streakCount, points }) => {
  const { currentUser, logout } = useContext(AuthContext);
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <header>
      <div className="logo">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Cubic E-Learning</Link>
      </div>
      
      <div className="header-content">
        <nav className="main-nav">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/courses" className="nav-link">Courses</Link>
          {currentUser?.role === 'admin' && (
            <Link to="/admin" className="nav-link admin-link">Admin</Link>
          )}
        </nav>
        
        <div className="user-stats">
          <div className="streak">
            <span className="badge badge-streak">{streakCount}</span>
            <span>Day Streak</span>
          </div>
          <div className="points">
            <span className="badge badge-points">{points}</span>
            <span>Points</span>
          </div>
        </div>
        
        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">Hi, {currentUser?.name}</span>
            {currentUser?.role === 'admin' && (
              <span className="admin-badge">Admin</span>
            )}
          </div>
          <button onClick={handleLogout} className="btn btn-logout">Logout</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
