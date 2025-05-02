import React, { useContext } from 'react';
import { DiscountContext } from '../context/DiscountContext';
import './DiscountBanner.css';

const DiscountBanner = () => {
  const { discountStatus } = useContext(DiscountContext);
  
  // Use actual discount data
  const hasDiscount = discountStatus && discountStatus.nextCourseDiscount > 0;
  const discountAmount = discountStatus?.nextCourseDiscount || 0;
  
  if (!hasDiscount) return null;
  
  return (
    <div className="discount-banner">
      <div className="discount-banner-content">
        <div className="discount-badge">
          {discountAmount}%
        </div>
        <div className="discount-info">
          <div className="discount-title">
            You've earned a discount on your next course!
          </div>
          <div className="discount-description">
            Stay active in your current course to maintain this discount. It decreases by 1% each day of inactivity.
          </div>
        </div>
      </div>
      <div className="discount-details-button">
        View Courses
      </div>
    </div>
  );
};

export default DiscountBanner;
