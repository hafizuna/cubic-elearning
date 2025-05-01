import React, { useContext } from 'react';
import DiscountContext from '../context/DiscountContext';

const DiscountMeter = ({ courseId, showDetails = true }) => {
  const { discountStatus } = useContext(DiscountContext);
  
  // If no active course discount or not for this course, show next course discount
  const isForActiveCourse = discountStatus.activeCourseDiscount && 
                           discountStatus.activeCourseDiscount.courseId === courseId;
  
  const discountToShow = isForActiveCourse 
    ? discountStatus.activeCourseDiscount.currentDiscount 
    : discountStatus.nextCourseDiscount;
  
  const startingDiscount = isForActiveCourse 
    ? discountStatus.activeCourseDiscount.startingDiscount 
    : 30;
  
  const missedDays = isForActiveCourse 
    ? discountStatus.activeCourseDiscount.missedDays 
    : 0;
  
  // Calculate percentage for the progress bar
  const percentage = Math.round((discountToShow / startingDiscount) * 100);
  
  if (discountStatus.loading) {
    return <div className="discount-meter loading">Loading discount information...</div>;
  }
  
  if (!isForActiveCourse && discountStatus.nextCourseDiscount === 0 && !showDetails) {
    return null; // Don't show anything if no discount and details are hidden
  }
  
  return (
    <div className="discount-meter">
      <h3 className="discount-title">
        {isForActiveCourse 
          ? 'Your Next Course Discount' 
          : discountStatus.nextCourseDiscount > 0 
            ? 'Your Earned Discount' 
            : 'Potential Discount'}
      </h3>
      
      <div className="discount-value">{discountToShow}%</div>
      
      <div className="discount-progress-container">
        <div 
          className="discount-progress-bar" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      {showDetails && (
        <div className="discount-details">
          {isForActiveCourse ? (
            <>
              <p>Complete this course to keep your discount!</p>
              {missedDays > 0 && (
                <p className="missed-days">
                  You've missed {missedDays} day{missedDays !== 1 ? 's' : ''}, 
                  reducing your discount by {missedDays}%.
                </p>
              )}
            </>
          ) : discountStatus.nextCourseDiscount > 0 ? (
            <p>This discount will be applied to your next course purchase.</p>
          ) : (
            <p>Start a course to earn up to 30% off your next purchase!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountMeter;
