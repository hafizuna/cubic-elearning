import React, { useContext, useEffect, useState } from 'react';
import DiscountContext from '../context/DiscountContext';
import DiscountMeter from './DiscountMeter';
import './DiscountMeter.css';

const DiscountHistory = () => {
  const { discountStatus, fetchDiscountStatus } = useContext(DiscountContext);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadDiscountData = async () => {
      setLoading(true);
      await fetchDiscountStatus();
      setLoading(false);
    };
    
    loadDiscountData();
  }, [fetchDiscountStatus]);
  
  if (loading) {
    return <div className="loading">Loading discount information...</div>;
  }
  
  return (
    <div className="discount-history">
      <h2>Your Discount Status</h2>
      
      <div className="discount-cards">
        {discountStatus.hasActiveDiscount ? (
          <div className="card discount-card active-discount">
            <h3>Active Course Discount</h3>
            <DiscountMeter courseId={discountStatus.activeCourseDiscount?.courseId} />
            <div className="discount-tips">
              <h4>How to Maintain Your Discount:</h4>
              <ul>
                <li>Log in daily to prevent discount reduction</li>
                <li>Complete lessons regularly</li>
                <li>Finish the course to apply this discount to your next purchase</li>
              </ul>
            </div>
          </div>
        ) : discountStatus.nextCourseDiscount > 0 ? (
          <div className="card discount-card earned-discount">
            <h3>Your Earned Discount</h3>
            <DiscountMeter />
            <p className="discount-info">
              This {discountStatus.nextCourseDiscount}% discount will be automatically applied to your next course purchase!
            </p>
          </div>
        ) : (
          <div className="card discount-card no-discount">
            <h3>No Active Discount</h3>
            <div className="discount-info">
              <div className="stat-value">30%</div>
              <div className="stat-label">Potential Discount</div>
              <p>Start a course to earn up to 30% off your next purchase!</p>
            </div>
            <div className="discount-tips">
              <h4>How the Discount System Works:</h4>
              <ul>
                <li>Start a course to receive a 30% discount promise</li>
                <li>Maintain consistency to keep your discount</li>
                <li>Each missed day reduces your discount by 1%</li>
                <li>Complete the course to apply your final discount to your next purchase</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      <div className="discount-explanation">
        <h3>About Our Discount System</h3>
        <p>
          Our unique discount system rewards consistency and course completion. 
          When you start a course, you'll receive a 30% discount promise for your next course purchase.
          To keep this discount, you need to maintain regular activity - each day without logging in 
          will reduce your discount by 1%. Complete the course to secure your final discount percentage!
        </p>
      </div>
    </div>
  );
};

export default DiscountHistory;
