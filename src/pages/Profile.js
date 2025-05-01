import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { DiscountContext } from '../context/DiscountContext';

const Profile = () => {
  const { currentUser } = useContext(AuthContext);
  const { discountStatus } = useContext(DiscountContext);
  
  if (!currentUser) {
    return <div className="loading">Please log in to view your profile</div>;
  }
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#3D52A0' }}>Your Profile</h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '25px', 
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: '#3D52A0', 
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
            <p style={{ margin: '0 0 15px 0', color: '#666' }}>{currentUser?.email}</p>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                padding: '10px 15px',
                borderRadius: '6px'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3D52A0' }}>
                  {currentUser?.streakCount || 0}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Day Streak</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                padding: '10px 15px',
                borderRadius: '6px'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3D52A0' }}>
                  {currentUser?.points || 0}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Discount Status Section */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '25px', 
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#3D52A0' }}>Your Discount Status</h2>
        
        {discountStatus.nextCourseDiscount > 0 ? (
          <div style={{ 
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid #3D52A0'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#3D52A0' }}>Available Discount</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#3D52A0',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              {discountStatus.nextCourseDiscount}% OFF
            </div>
            <p style={{ margin: '0', textAlign: 'center' }}>
              This discount will be automatically applied to your next course purchase!
            </p>
          </div>
        ) : discountStatus.hasActiveDiscount ? (
          <div style={{ 
            backgroundColor: 'rgba(76, 201, 240, 0.1)',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid #4cc9f0'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#4cc9f0' }}>Active Course Discount</h3>
            <div style={{ 
              fontSize: '1.8rem', 
              fontWeight: 'bold', 
              color: '#4cc9f0',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              Current: {discountStatus.activeCourseDiscount?.currentDiscount || 0}% 
              <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>
                (Started with {discountStatus.activeCourseDiscount?.startingDiscount || 30}%)
              </span>
            </div>
            <p style={{ margin: '0', textAlign: 'center' }}>
              Complete your current course to secure this discount for your next purchase!
            </p>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: 'rgba(247, 37, 133, 0.1)',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid #f72585'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f72585' }}>No Active Discount</h3>
            <div style={{ 
              fontSize: '1.8rem', 
              fontWeight: 'bold', 
              color: '#f72585',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              Start a course to earn 30% OFF
            </div>
            <p style={{ margin: '0', textAlign: 'center' }}>
              Begin learning to receive a 30% discount promise for your next purchase!
            </p>
          </div>
        )}
        
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>How the Discount System Works</h3>
          <ul style={{ paddingLeft: '20px', margin: '0' }}>
            <li style={{ marginBottom: '10px' }}>Start a course to receive a 30% discount promise</li>
            <li style={{ marginBottom: '10px' }}>Each missed day reduces your discount by 1%</li>
            <li style={{ marginBottom: '10px' }}>Complete the course to secure your final discount</li>
            <li style={{ marginBottom: '0' }}>Your earned discount will be applied to your next course purchase</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Profile;
