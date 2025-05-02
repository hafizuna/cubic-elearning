const User = require('../models/User');
const UserCourse = require('../models/UserCourse');
const Course = require('../models/Course');

/**
 * Initialize a discount for a user starting a new course
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course's ID
 */
const initializeDiscount = async (userId, courseId) => {
  try {
    // Check if user already has this course
    const existingUserCourse = await UserCourse.findOne({ 
      user: userId, 
      course: courseId 
    });
    
    if (existingUserCourse) {
      // If already exists, just ensure discount is set
      if (existingUserCourse.currentDiscount === undefined) {
        existingUserCourse.startingDiscount = 30;
        existingUserCourse.currentDiscount = 30;
        existingUserCourse.lastConsistencyCheck = new Date();
        await existingUserCourse.save();
      }
    } else {
      // Create new user course with discount
      await UserCourse.create({
        user: userId,
        course: courseId,
        startingDiscount: 30,
        currentDiscount: 30,
        lastConsistencyCheck: new Date()
      });
    }
    
    // Update user's active course and set next course discount
    await User.findByIdAndUpdate(userId, {
      activeCourseId: courseId,
      nextCourseDiscount: 30 // Set the next course discount to 30%
    });
    
    return { success: true, message: 'Discount initialized successfully' };
  } catch (error) {
    console.error('Error initializing discount:', error);
    return { success: false, message: 'Failed to initialize discount' };
  }
};

/**
 * Check user consistency and update discount if needed
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course's ID
 */
const checkConsistency = async (userId, courseId) => {
  try {
    const userCourse = await UserCourse.findOne({ user: userId, course: courseId });
    
    if (!userCourse) {
      return { success: false, message: 'User course not found' };
    }
    
    const lastCheck = new Date(userCourse.lastConsistencyCheck);
    const now = new Date();
    
    // Calculate days since last check
    const daysSinceLastCheck = Math.floor((now - lastCheck) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastCheck > 1) {
      // User missed days - reduce discount
      const missedDays = daysSinceLastCheck - 1; // Subtract 1 to allow for one day gap
      
      if (missedDays > 0) {
        userCourse.missedDays += missedDays;
        
        // Reduce discount by 1% for each missed day, but not below 0
        userCourse.currentDiscount = Math.max(0, userCourse.currentDiscount - missedDays);
        
        console.log(`Reduced discount for user ${userId} by ${missedDays}% due to inactivity`);
      }
    }
    
    // Update last consistency check
    userCourse.lastConsistencyCheck = now;
    await userCourse.save();
    
    return { 
      success: true, 
      currentDiscount: userCourse.currentDiscount,
      startingDiscount: userCourse.startingDiscount,
      missedDays: userCourse.missedDays
    };
  } catch (error) {
    console.error('Error checking consistency:', error);
    return { success: false, message: 'Failed to check consistency' };
  }
};

/**
 * Complete a course and apply the earned discount to the user's account
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course's ID
 */
const completeCourseAndApplyDiscount = async (userId, courseId) => {
  try {
    const userCourse = await UserCourse.findOne({ user: userId, course: courseId });
    
    if (!userCourse) {
      return { success: false, message: 'User course not found' };
    }
    
    // Get the final discount
    const finalDiscount = userCourse.currentDiscount;
    
    // Apply the discount to the user's account for their next course
    await User.findByIdAndUpdate(userId, {
      nextCourseDiscount: finalDiscount,
      activeCourseId: null // Clear active course since it's completed
    });
    
    return { 
      success: true, 
      finalDiscount,
      message: `Course completed! You've earned a ${finalDiscount}% discount on your next course.`
    };
  } catch (error) {
    console.error('Error completing course and applying discount:', error);
    return { success: false, message: 'Failed to apply discount' };
  }
};

/**
 * Apply a user's discount to a course purchase
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course to purchase
 */
const applyDiscountToPurchase = async (userId, courseId) => {
  try {
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    
    if (!user || !course) {
      return { success: false, message: 'User or course not found' };
    }
    
    const discount = user.nextCourseDiscount || 0;
    const originalPrice = course.price || 0;
    
    // Calculate discounted price
    const discountAmount = (originalPrice * discount) / 100;
    const discountedPrice = Math.max(0, originalPrice - discountAmount);
    
    // Reset the discount after using it
    if (discount > 0) {
      user.nextCourseDiscount = 0;
      await user.save();
    }
    
    return { 
      success: true, 
      originalPrice,
      discount,
      discountAmount,
      finalPrice: discountedPrice,
      message: discount > 0 ? `Applied a ${discount}% discount!` : 'No discount available'
    };
  } catch (error) {
    console.error('Error applying discount to purchase:', error);
    return { success: false, message: 'Failed to apply discount' };
  }
};

/**
 * Get a user's current discount status
 * @param {string} userId - The user's ID
 */
const getUserDiscountStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    let activeCourseDiscount = null;
    
    // If user has an active course, get the current discount for it
    if (user.activeCourseId) {
      const userCourse = await UserCourse.findOne({ 
        user: userId, 
        course: user.activeCourseId 
      });
      
      if (userCourse) {
        activeCourseDiscount = {
          courseId: user.activeCourseId,
          startingDiscount: userCourse.startingDiscount,
          currentDiscount: userCourse.currentDiscount,
          missedDays: userCourse.missedDays
        };
      }
    }
    
    return { 
      success: true, 
      nextCourseDiscount: user.nextCourseDiscount || 0,
      activeCourseDiscount,
      hasActiveDiscount: !!activeCourseDiscount
    };
  } catch (error) {
    console.error('Error getting user discount status:', error);
    return { success: false, message: 'Failed to get discount status' };
  }
};

module.exports = {
  initializeDiscount,
  checkConsistency,
  completeCourseAndApplyDiscount,
  applyDiscountToPurchase,
  getUserDiscountStatus
};
