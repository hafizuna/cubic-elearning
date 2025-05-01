import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { DiscountContext } from '../context/DiscountContext';
import { showNotification } from '../components/NotificationManager';
import './Header.css';

const Header = ({ streakCount, points }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const { discountStatus } = useContext(DiscountContext);
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <header>
      <div className="logo">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}> E-Learning</Link>
      </div>
      
      <div className="header-content">
        <nav className="main-nav">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/courses" className="nav-link">Courses</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
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
          {discountStatus && discountStatus.nextCourseDiscount > 0 && (
            <div style={{
              backgroundColor: '#f72585',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '6px',
              marginLeft: '15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px solid white'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{discountStatus.nextCourseDiscount}%</span>
              <span style={{ fontSize: '0.7rem' }}>DISCOUNT</span>
            </div>
          )}
          {discountStatus && discountStatus.hasActiveDiscount && (
            <div style={{
              backgroundColor: '#4cc9f0',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '6px',
              marginLeft: '15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px solid white'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{discountStatus.activeCourseDiscount?.currentDiscount || 0}%</span>
              <span style={{ fontSize: '0.7rem' }}>ACTIVE</span>
            </div>
          )}
        </div>
        
        <div className="user-menu">
          <div className="user-info">
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white', marginRight: '10px' }}>👤 {currentUser?.name}</span>
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
