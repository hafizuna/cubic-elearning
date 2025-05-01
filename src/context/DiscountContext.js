import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { showNotification } from '../components/NotificationManager';
import axios from 'axios';
import { discountAPI } from '../services/api';

export const DiscountContext = createContext();

export const DiscountProvider = ({ children }) => {
  const [discountStatus, setDiscountStatus] = useState({
    nextCourseDiscount: 0,
    activeCourseDiscount: null,
    hasActiveDiscount: false,
    loading: true,
    error: null
  });
  
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  
  // Fetch discount status when user logs in
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchDiscountStatus();
    } else {
      // Reset discount status when user logs out
      setDiscountStatus({
        nextCourseDiscount: 0,
        activeCourseDiscount: null,
        hasActiveDiscount: false,
        loading: false,
        error: null
      });
    }
  }, [isAuthenticated, currentUser]);
  
  // Fetch the user's current discount status
  const fetchDiscountStatus = async () => {
    try {
      setDiscountStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await discountAPI.getDiscountStatus();
      
      setDiscountStatus({
        nextCourseDiscount: response.nextCourseDiscount || 0,
        activeCourseDiscount: response.activeCourseDiscount,
        hasActiveDiscount: response.hasActiveDiscount,
        loading: false,
        error: null
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching discount status:', error);
      setDiscountStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load discount information'
      }));
      return null;
    }
  };
  
  // Initialize discount for a course
  const initializeDiscount = async (courseId) => {
    try {
      const response = await discountAPI.initializeDiscount(courseId);
      
      if (response.success) {
        showNotification('You now have a 30% discount for your next course! Complete this course to keep it.', 'achievement');
        await fetchDiscountStatus(); // Refresh discount status
      }
      
      return response;
    } catch (error) {
      console.error('Error initializing discount:', error);
      showNotification('Failed to initialize discount', 'error');
      return { success: false, message: 'Failed to initialize discount' };
    }
  };
  
  // Check consistency and update discount
  const checkConsistency = async (courseId) => {
    try {
      const response = await discountAPI.checkConsistency(courseId);
      setDiscountStatus(prevState => ({
        ...prevState,
        activeCourseDiscount: response.activeCourseDiscount
      }));
      
      // Notify user if discount changed
      const prevDiscount = discountStatus.activeCourseDiscount?.currentDiscount;
      const newDiscount = response.activeCourseDiscount?.currentDiscount;
      
      if (prevDiscount && newDiscount && prevDiscount > newDiscount) {
        const lostAmount = prevDiscount - newDiscount;
        showNotification(
          `Your discount has decreased by ${lostAmount}% due to missed days. Current discount: ${newDiscount}%`,
          'warning'
        );
      }
      
      return response;
    } catch (error) {
      console.error('Error checking consistency:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Complete course and apply discount
  const completeCourseAndApplyDiscount = async (courseId) => {
    try {
      const response = await discountAPI.completeCourse(courseId);
      
      if (response.success) {
        showNotification(
          `Congratulations! You've earned a ${response.nextCourseDiscount}% discount on your next course purchase!`,
          'achievement'
        );
        await fetchDiscountStatus(); // Refresh discount status
      }
      
      return response;
    } catch (error) {
      console.error('Error completing course and applying discount:', error);
      showNotification('Failed to apply discount', 'error');
      return { success: false, message: 'Failed to apply discount' };
    }
  };
  
  // Apply discount to purchase
  const applyDiscountToPurchase = async (courseId) => {
    try {
      const response = await discountAPI.applyDiscount(courseId);
      
      if (response.success) {
        await fetchDiscountStatus(); // Refresh discount status
      }
      
      return response;
    } catch (error) {
      console.error('Error applying discount:', error);
      showNotification('Failed to apply discount', 'error');
      return { success: false, message: 'Failed to apply discount' };
    }
  };
  
  return (
    <DiscountContext.Provider
      value={{
        discountStatus,
        fetchDiscountStatus,
        initializeDiscount,
        checkConsistency,
        completeCourseAndApplyDiscount,
        applyDiscountToPurchase
      }}
    >
      {children}
    </DiscountContext.Provider>
  );
};

export default DiscountContext;
