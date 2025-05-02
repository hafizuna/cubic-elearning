const UserCourse = require('../models/UserCourse');
const discountService = require('../services/discountService');

/**
 * Check consistency for all active user courses
 * This function should be scheduled to run daily
 */
const checkAllUserConsistency = async () => {
  try {
    console.log('Running scheduled consistency check for all users...');
    
    // Get all user courses with active discounts
    const userCourses = await UserCourse.find({
      currentDiscount: { $gt: 0 } // Only check courses with active discounts
    });
    
    console.log(`Found ${userCourses.length} courses with active discounts`);
    
    // Check consistency for each user course
    for (const userCourse of userCourses) {
      try {
        const result = await discountService.checkConsistency(
          userCourse.user, 
          userCourse.course
        );
        
        if (result.success) {
          console.log(`Updated discount for user ${userCourse.user} on course ${userCourse.course}: ${result.currentDiscount}%`);
        } else {
          console.error(`Failed to update discount for user ${userCourse.user} on course ${userCourse.course}: ${result.message}`);
        }
      } catch (error) {
        console.error(`Error checking consistency for user ${userCourse.user} on course ${userCourse.course}:`, error);
      }
    }
    
    console.log('Completed scheduled consistency check');
  } catch (error) {
    console.error('Error running scheduled consistency check:', error);
  }
};

module.exports = {
  checkAllUserConsistency
};
