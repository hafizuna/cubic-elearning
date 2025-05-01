import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import DiscountContext from '../context/DiscountContext';
import { userAPI } from '../services/api';
import { showNotification } from '../components/NotificationManager';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useContext(AuthContext);
  const { discountStatus, fetchDiscountStatus } = useContext(DiscountContext);
  
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const userData = await userAPI.getProfile();
        setProfile(userData);
        await fetchDiscountStatus();
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [fetchDiscountStatus]);
  
  if (loading) {
    return <div className="loading">Loading profile information...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <div className="page-container">
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Your Profile</h1>
      
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--primary-color)', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginRight: '20px'
          }}>
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div>
            <h2 style={{ margin: '0 0 5px 0' }}>{currentUser?.name}</h2>
            <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)' }}>{currentUser?.email}</p>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                padding: '10px 15px',
                borderRadius: '6px'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {profile?.streakCount || 0}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day Streak</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                padding: '10px 15px',
                borderRadius: '6px'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {profile?.points || 0}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Points</span>
              </div>
            </div>
          </div>
        </div>
        
        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
        
        <h3 style={{ marginBottom: '15px' }}>Your Discount Status</h3>
        
        {discountStatus.nextCourseDiscount > 0 ? (
          <div style={{ 
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid var(--primary-color)'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Available Discount</h4>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: 'var(--primary-color)',
              marginBottom: '10px'
            }}>
              {discountStatus.nextCourseDiscount}% OFF
            </div>
            <p style={{ margin: '0' }}>
              This discount will be automatically applied to your next course purchase!
            </p>
          </div>
        ) : discountStatus.hasActiveDiscount ? (
          <div style={{ 
            backgroundColor: 'rgba(76, 201, 240, 0.1)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid var(--success-color)'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Active Course Discount</h4>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: 'var(--success-color)',
              marginBottom: '10px'
            }}>
              Current: {discountStatus.activeCourseDiscount?.currentDiscount || 0}% 
              (Started with {discountStatus.activeCourseDiscount?.startingDiscount || 30}%)
            </div>
            <p style={{ margin: '0' }}>
              Complete your current course to secure this discount for your next purchase!
            </p>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: 'rgba(247, 37, 133, 0.1)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid var(--warning-color)'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>No Active Discount</h4>
            <p style={{ margin: '0 0 10px 0' }}>
              Start a course to receive a 30% discount promise for your next purchase!
            </p>
          </div>
        )}
        
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>How the Discount System Works</h4>
          <ul style={{ paddingLeft: '20px', margin: '0' }}>
            <li style={{ marginBottom: '8px' }}>Start a course to receive a 30% discount promise</li>
            <li style={{ marginBottom: '8px' }}>Each missed day reduces your discount by 1%</li>
            <li style={{ marginBottom: '8px' }}>Complete the course to secure your final discount</li>
            <li style={{ marginBottom: '0' }}>Your earned discount will be applied to your next course purchase</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
