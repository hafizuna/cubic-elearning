import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { DiscountContext } from '../context/DiscountContext';

const HeaderNew = ({ streakCount, points }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const { discountStatus } = useContext(DiscountContext);
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <header style={{
      backgroundColor: '#f72585', // Changed to pink to be very distinctive
      color: 'white',
      padding: '15px 25px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.2rem' }}>NEW HEADER - E-Learning</Link>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* Main Navigation */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '30px'
        }}>
          <Link to="/" style={{
            color: 'white',
            textDecoration: 'none',
            margin: '0 15px',
            fontWeight: '500',
            position: 'relative',
            padding: '5px 0'
          }}>Dashboard</Link>
          
          <Link to="/courses" style={{
            color: 'white',
            textDecoration: 'none',
            margin: '0 15px',
            fontWeight: '500',
            position: 'relative',
            padding: '5px 0'
          }}>Courses</Link>
          
          {currentUser?.role === 'admin' && (
            <Link to="/admin" style={{
              color: 'white',
              textDecoration: 'none',
              margin: '0 15px',
              fontWeight: '500',
              position: 'relative',
              padding: '5px 0',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              padding: '5px 10px'
            }}>Admin</Link>
          )}
        </nav>
        
        {/* User Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '30px'
        }}>
          {/* Streak Count */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginRight: '15px'
          }}>
            <span style={{
              backgroundColor: '#f72585',
              color: 'white',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1rem',
              marginBottom: '3px'
            }}>{streakCount}</span>
            <span style={{
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>Streak</span>
          </div>
          
          {/* Points */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginRight: '15px'
          }}>
            <span style={{
              backgroundColor: '#4cc9f0',
              color: 'white',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1rem',
              marginBottom: '3px'
            }}>{points}</span>
            <span style={{
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>Points</span>
          </div>
          
          {/* Discount Badge - Always show for testing */}
          <div style={{
            backgroundColor: '#4cc9f0',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '6px',
            marginLeft: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>30%</span>
            <span style={{ fontSize: '0.7rem' }}>DISCOUNT</span>
          </div>
          
          {/* Active Discount Badge - Only show if there's an active discount */}
          {discountStatus && discountStatus.hasActiveDiscount && (
            <div style={{
              backgroundColor: '#4cc9f0',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '6px',
              marginLeft: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{discountStatus.activeCourseDiscount?.currentDiscount || 0}%</span>
              <span style={{ fontSize: '0.7rem' }}>ACTIVE</span>
            </div>
          )}
        </div>
        
        {/* User Menu */}
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            marginRight: '15px',
            textAlign: 'right'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>👤 {currentUser?.name}</div>
            {currentUser?.role === 'admin' && (
              <div style={{
                fontSize: '0.7rem',
                backgroundColor: '#f72585',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                display: 'inline-block',
                marginTop: '3px'
              }}>Admin</div>
            )}
          </div>
          
          <button 
            onClick={handleLogout} 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.3s'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderNew;
