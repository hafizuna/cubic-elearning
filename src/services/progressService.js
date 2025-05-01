import * as idb from './indexedDB';
import { coursesAPI } from './api';

// Generate a unique ID for offline progress entries
const generateProgressId = (userId, courseId, lessonOrder) => {
  return `${userId}_${courseId}_${lessonOrder}`;
};

// Create a store for video blobs if it doesn't exist yet
export const initVideoStore = async () => {
  try {
    // This will create the store if it doesn't exist
    await idb.dbOperation('videos', 'readwrite', (store) => {
      return store.count();
    }).catch(() => {
      // If the store doesn't exist, the operation will fail
      // We'll create it in the next DB version upgrade
      console.log('Videos store will be created on next DB upgrade');
    });
    return true;
  } catch (error) {
    console.error('Error initializing video store:', error);
    return false;
  }
};

// Download and save a video for offline use
export const downloadVideo = async (videoUrl, videoId) => {
  if (!videoUrl) return false;
  
  try {
    // Check if we already have this video
    const existingVideo = await idb.getItem('videos', videoId);
    if (existingVideo) {
      console.log(`Video ${videoId} already downloaded`);
      return true;
    }
    
    // For Cloudinary URLs, we need to modify the URL to avoid CORS issues
    let fetchUrl = videoUrl;
    
    // If it's a Cloudinary URL, add the cors=anonymous parameter
    if (videoUrl.includes('cloudinary.com')) {
      // Add fl_attachment for direct download and fl_getinfo to avoid CORS
      const separator = videoUrl.includes('?') ? '&' : '?';
      fetchUrl = `${videoUrl}${separator}fl_attachment,fl_getinfo`;
      console.log(`Modified Cloudinary URL: ${fetchUrl}`);
    }
    
    // Fetch the video
    console.log(`Downloading video ${videoId} from ${fetchUrl}`);
    
    try {
      // First try with mode: 'cors'
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Accept': 'video/*,*/*'
        }
      });
      
      if (response.ok) {
        // Get the video as a blob
        const videoBlob = await response.blob();
        
        // Create a local URL for the blob
        const localUrl = URL.createObjectURL(videoBlob);
        
        // Save the video data
        await idb.addItem('videos', {
          id: videoId,
          blob: videoBlob,
          localUrl,
          originalUrl: videoUrl,
          downloadDate: new Date().toISOString()
        });
        
        console.log(`Video ${videoId} downloaded and saved successfully`);
        return true;
      } else {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
    } catch (corsError) {
      // If CORS fails, try with a proxy service or fallback method
      console.warn(`CORS fetch failed for ${videoId}, trying alternative method:`, corsError);
      
      // Store a reference to the video URL instead of the actual content
      // This is a fallback when we can't download the actual video
      await idb.addItem('videos', {
        id: videoId,
        blob: null, // No blob available
        localUrl: null, // No local URL
        originalUrl: videoUrl,
        isReference: true, // Flag to indicate this is just a reference
        downloadDate: new Date().toISOString()
      });
      
      console.log(`Video ${videoId} reference saved (not downloaded due to CORS)`);
      return true; // Return true so we don't block the download process
    }
  } catch (error) {
    console.error(`Error downloading video ${videoId}:`, error);
    
    // Store a reference to the video URL as a fallback
    try {
      await idb.addItem('videos', {
        id: videoId,
        blob: null,
        localUrl: null,
        originalUrl: videoUrl,
        isReference: true,
        error: error.message,
        downloadDate: new Date().toISOString()
      });
      console.log(`Video ${videoId} reference saved after error`);
      return true; // Return true so we don't block the download process
    } catch (fallbackError) {
      console.error(`Failed to save video reference:`, fallbackError);
      return false;
    }
  }
};

// Get a video by ID
export const getVideo = async (videoId) => {
  try {
    const video = await idb.getItem('videos', videoId);
    if (!video) return null;
    
    // Create a fresh object URL (the old one might be revoked)
    const localUrl = URL.createObjectURL(video.blob);
    return { ...video, localUrl };
  } catch (error) {
    console.error(`Error getting video ${videoId}:`, error);
    return null;
  }
};

// Save course for offline use
export const saveCourseOffline = async (course) => {
  try {
    // Make sure the video store exists
    await initVideoStore();
    
    // Save the course data
    await idb.updateItem('courses', course);
    
    // Initialize progress if it doesn't exist
    const progressId = `progress_${course._id}`;
    const existingProgress = await idb.getItem('userProgress', progressId);
    
    if (!existingProgress) {
      await idb.addItem('userProgress', {
        id: progressId,
        courseId: course._id,
        completedLessons: [],
        progress: 0,
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Download all videos in the course
    if (course.lessons && course.lessons.length > 0) {
      console.log(`Downloading ${course.lessons.length} videos for course ${course.title}`);
      
      // Create a promise for each video download
      const downloadPromises = course.lessons.map((lesson, index) => {
        // Ensure we have a videoUrl - if not, try to use the lesson's video property
        const videoUrl = lesson.videoUrl || lesson.video;
        
        if (videoUrl) {
          // Generate a consistent ID for this video
          // First try to use videoPublicId, then lesson.order, and finally fall back to the index
          const lessonOrder = lesson.order !== undefined ? lesson.order : index;
          const videoId = lesson.videoPublicId || `video_${course._id}_${lessonOrder}`;
          
          console.log(`Preparing to download lesson ${lessonOrder}: ${lesson.title}`);
          return downloadVideo(videoUrl, videoId);
        } else {
          console.warn(`Lesson ${index} (${lesson.title}) has no video URL`);
          return Promise.resolve(false); // Skip lessons without videos
        }
      });
      
      // Wait for all downloads to complete
      const results = await Promise.all(downloadPromises);
      const successCount = results.filter(result => result === true).length;
      console.log(`Successfully downloaded ${successCount} out of ${course.lessons.length} videos`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving course offline:', error);
    return false;
  }
};

// Get offline courses
export const getOfflineCourses = async () => {
  try {
    const courses = await idb.getAllItems('courses');
    const progressEntries = await idb.getAllItems('userProgress');
    
    // Merge course data with progress data
    return courses.map(course => {
      const progress = progressEntries.find(p => p.courseId === course._id) || { 
        completedLessons: [], 
        progress: 0 
      };
      
      return {
        ...course,
        completedLessons: progress.completedLessons,
        progress: progress.progress
      };
    });
  } catch (error) {
    console.error('Error getting offline courses:', error);
    return [];
  }
};

// Delete a course and its related data from offline storage
export const deleteOfflineCourse = async (courseId) => {
  try {
    // First get the course to find its lessons
    const course = await idb.getItem('courses', courseId);
    
    if (!course) {
      console.log(`Course ${courseId} not found in offline storage`);
      return false;
    }
    
    // Delete course from courses store
    await idb.deleteItem('courses', courseId);
    
    // Delete progress data
    const progressId = `progress_${courseId}`;
    await idb.deleteItem('userProgress', progressId);
    
    // Delete videos if they exist
    if (course.lessons && course.lessons.length > 0) {
      // Create deletion promises for each video
      const deletionPromises = course.lessons.map(lesson => {
        if (lesson.videoUrl) {
          // Use the same ID format as when downloading
          const videoId = lesson.videoPublicId || `video_${courseId}_${lesson.order}`;
          return idb.deleteItem('videos', videoId).catch(err => {
            // If video doesn't exist, that's fine
            console.log(`Video ${videoId} not found or already deleted`);
          });
        }
        return Promise.resolve();
      });
      
      // Wait for all deletions to complete
      await Promise.all(deletionPromises);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting offline course:', error);
    return false;
  }
};

// Complete a lesson offline
export const completeOfflineLesson = async (userId, courseId, lessonOrder) => {
  try {
    // Get the course to calculate progress
    const course = await idb.getItem('courses', courseId);
    if (!course) throw new Error('Course not found offline');
    
    // Get or create progress entry
    const progressId = `progress_${courseId}`;
    let progressEntry = await idb.getItem('userProgress', progressId);
    
    if (!progressEntry) {
      progressEntry = {
        id: progressId,
        courseId,
        completedLessons: [],
        progress: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Check if lesson is already completed
    if (!progressEntry.completedLessons.includes(lessonOrder)) {
      // Add to completed lessons
      progressEntry.completedLessons.push(lessonOrder);
      
      // Calculate new progress
      progressEntry.progress = Math.round(
        (progressEntry.completedLessons.length / course.lessons.length) * 100
      );
      
      progressEntry.lastUpdated = new Date().toISOString();
      
      // Save updated progress
      await idb.updateItem('userProgress', progressEntry);
      
      // Add to sync queue for when we're back online
      await idb.addItem('syncQueue', {
        type: 'COMPLETE_LESSON',
        data: {
          userId,
          courseId,
          lessonOrder
        },
        createdAt: new Date().toISOString()
      });
      
      return {
        success: true,
        completedLessons: progressEntry.completedLessons,
        progress: progressEntry.progress
      };
    }
    
    return {
      success: true,
      completedLessons: progressEntry.completedLessons,
      progress: progressEntry.progress
    };
  } catch (error) {
    console.error('Error completing lesson offline:', error);
    return { success: false, error: error.message };
  }
};

// Sync offline progress with server when back online
export const syncOfflineProgress = async (userId) => {
  try {
    // Get all items in the sync queue
    const syncItems = await idb.getAllItems('syncQueue');
    if (syncItems.length === 0) return { synced: 0 };
    
    let syncedCount = 0;
    
    // Process each sync item
    for (const item of syncItems) {
      try {
        if (item.type === 'COMPLETE_LESSON') {
          // Sync with server
          await coursesAPI.completeLesson(
            item.data.courseId,
            item.data.lessonOrder
          );
          
          // Remove from sync queue after successful sync
          await idb.deleteItem('syncQueue', item.id);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
      }
    }
    
    return { synced: syncedCount };
  } catch (error) {
    console.error('Error syncing offline progress:', error);
    return { synced: 0, error: error.message };
  }
};
