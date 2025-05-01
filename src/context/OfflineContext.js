import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import * as progressService from '../services/progressService';
import { coursesAPI } from '../services/api';
import { showNotification } from '../components/NotificationManager';

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCourses, setOfflineCourses] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const { currentUser } = useContext(AuthContext);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('You are back online!', 'achievement');
      if (currentUser) {
        syncProgress();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('You are offline. You can still access downloaded courses.', 'download');
      loadOfflineCourses();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial load of offline courses
    loadOfflineCourses();
    
    // Set the initial online status
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);
  
  // Load offline courses from IndexedDB
  const loadOfflineCourses = async () => {
    try {
      console.log('Loading offline courses from IndexedDB...');
      const courses = await progressService.getOfflineCourses();
      console.log(`Found ${courses.length} offline courses:`, courses);
      setOfflineCourses(courses);
    } catch (error) {
      console.error('Error loading offline courses:', error);
      // Provide a fallback empty array to avoid undefined issues
      setOfflineCourses([]);
    }
  };
  
  // Download a course for offline use
  const downloadCourse = async (course) => {
    if (!isOnline) {
      showNotification('You must be online to download a course', 'download');
      return { success: false };
    }

    try {
      setDownloading(true);
      showNotification('Downloading course and videos... This may take a while.', 'download');
      
      // First, try to get the full course data if we don't have it
      let fullCourse = course;
      if (!course.lessons || course.lessons.length === 0) {
        try {
          fullCourse = await coursesAPI.getCourseById(course._id);
        } catch (error) {
          console.error('Error fetching full course data:', error);
          showNotification('Error fetching complete course data', 'download');
          return { success: false };
        }
      }
      
      // Mark the course as downloaded in the backend
      const response = await coursesAPI.downloadCourse(fullCourse._id);
      
      // The backend API doesn't return a success property, but if we get here without an error, it was successful
      // Save the course and its videos to IndexedDB
      // This will download all videos in the course
      const success = await progressService.saveCourseOffline(fullCourse);
      
      if (success) {
        // Update the offlineCourses state
        await loadOfflineCourses(); // Refresh the list
        
        showNotification(`Course '${fullCourse.title}' and videos downloaded successfully!`, 'download');
        return { success: true };
      } else {
        throw new Error('Failed to save course offline');
      }
    } catch (error) {
      console.error('Error downloading course:', error);
      showNotification(`Failed to download course: ${error.message}`, 'download');
      return { success: false };
    } finally {
      setDownloading(false);
    }
  };
  
  // Complete a lesson (works online or offline)
  const completeLesson = async (courseId, lessonOrder) => {
    if (!currentUser) return { success: false, error: 'User not authenticated' };
    
    if (isOnline) {
      // Online - use the API directly
      try {
        const response = await coursesAPI.completeLesson(courseId, lessonOrder);
        showNotification('Lesson completed! +5 points', 'points');
        
        // Also update our offline copy if we have it
        const offlineCourse = offlineCourses.find(c => c._id === courseId);
        if (offlineCourse) {
          await progressService.completeOfflineLesson(
            currentUser.id,
            courseId,
            lessonOrder
          );
          await loadOfflineCourses(); // Refresh the list
        }
        
        return { success: true, ...response };
      } catch (error) {
        console.error('Error completing lesson:', error);
        showNotification(`Failed to complete lesson: ${error.message}`, 'points');
        return { success: false, error: error.message };
      }
    } else {
      // Offline - use local storage
      try {
        const result = await progressService.completeOfflineLesson(
          currentUser.id,
          courseId,
          lessonOrder
        );
        
        if (result.success) {
          showNotification('Lesson completed offline! Progress will sync when you reconnect.', 'points');
          await loadOfflineCourses(); // Refresh the list
        } else {
          showNotification(`Failed to complete lesson offline: ${result.error}`, 'points');
        }
        
        return result;
      } catch (error) {
        console.error('Error completing lesson offline:', error);
        showNotification(`Failed to complete lesson offline: ${error.message}`, 'points');
        return { success: false, error: error.message };
      }
    }
  };
  
  // Sync offline progress with the server
  const syncProgress = async () => {
    if (!currentUser || !isOnline) return;
    
    try {
      setIsSyncing(true);
      const result = await progressService.syncOfflineProgress(currentUser.id);
      
      if (result.synced > 0) {
        showNotification(`Synced ${result.synced} offline activities with the server!`, 'achievement');
        await loadOfflineCourses(); // Refresh with latest data
      }
    } catch (error) {
      console.error('Error syncing progress:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Check if a course is available offline
  const isCourseAvailableOffline = (courseId) => {
    return offlineCourses.some(course => course._id === courseId);
  };
  
  // Get the download status
  const isDownloading = () => {
    return downloading;
  };
  
  // Remove a course from offline storage
  const removeOfflineCourse = async (courseId) => {
    try {
      // Get the course to find its lessons
      const course = offlineCourses.find(c => c._id === courseId);
      
      if (course) {
        // Delete course data
        await progressService.deleteOfflineCourse(courseId);
        
        // Update the state
        setOfflineCourses(prev => prev.filter(c => c._id !== courseId));
        
        // If online, update the server
        if (isOnline && currentUser) {
          try {
            // We don't have an API for this yet, but we could add one
            // await coursesAPI.markCourseAsNotDownloaded(courseId);
          } catch (error) {
            console.error('Error updating server:', error);
          }
        }
        
        showNotification(`Course '${course.title}' removed from offline storage`, 'download');
        return { success: true };
      } else {
        return { success: false, error: 'Course not found in offline storage' };
      }
    } catch (error) {
      console.error('Error removing offline course:', error);
      showNotification('Failed to remove course from offline storage', 'download');
      return { success: false, error: error.message };
    }
  };
  
  const value = {
    isOnline,
    offlineCourses,
    isSyncing,
    downloadCourse,
    completeLesson,
    syncProgress,
    isCourseAvailableOffline,
    isDownloading,
    removeOfflineCourse
  };
  
  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
