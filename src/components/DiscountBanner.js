import React, { useContext } from 'react';
import { DiscountContext } from '../context/DiscountContext';

const DiscountBanner = () => {
  const { discountStatus } = useContext(DiscountContext);
  
  // Always show a discount for demonstration purposes
  const hasDiscount = true; // Change this to use actual data: discountStatus && discountStatus.nextCourseDiscount > 0
  const discountAmount = discountStatus?.nextCourseDiscount || 30; // Default to 30% for demo
  
  if (!hasDiscount) return null;
  
  return (
    <div style={{
      backgroundColor: '#f72585',
      color: 'white',
      padding: '15px',
      margin: '0 0 20px 0',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      maxWidth: '1200px',
      width: '100%',
      marginLeft: 'auto',
      marginRight: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ 
          backgroundColor: 'white', 
          color: '#f72585', 
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          marginRight: '20px'
        }}>
          {discountAmount}%
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '5px' }}>
            You've earned a discount!
          </div>
          <div>
            This discount will be automatically applied to your next course purchase
          </div>
        </div>
      </div>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '8px 15px',
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}>
        View Details
      </div>
    </div>
  );
};

export default DiscountBanner;
