import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import { showNotification } from '../components/NotificationManager';
import OfflineContext from '../context/OfflineContext';
import { DiscountContext } from '../context/DiscountContext';
import { getVideo } from '../services/progressService';
import DiscountMeter from '../components/DiscountMeter';
import '../components/DiscountMeter.css';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isPurchased, setIsPurchased] = useState(false);
  
  // Use the offline and discount contexts
  const { isOnline, offlineCourses, completeLesson, isCourseAvailableOffline } = useContext(OfflineContext);
  const { initializeDiscount, checkConsistency, completeCourseAndApplyDiscount, discountStatus } = useContext(DiscountContext);
  
  // Check if the course is available offline
  const isAvailableOffline = isCourseAvailableOffline(id);
  
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        
        // If we're offline and the course isn't downloaded, we can't view it
        if (!isOnline && !isAvailableOffline) {
          showNotification('This course is not available offline. Please download it when you are online.', 'download');
          navigate('/courses');
          return;
        }
        
        // If offline, get the course from the offline courses
        if (!isOnline) {
          const offlineCourse = offlineCourses.find(c => c._id === id);
          if (offlineCourse) {
            setCourse(offlineCourse);
            setCompletedLessons(offlineCourse.completedLessons || []);
            setProgress(offlineCourse.progress || 0);
            // If it's offline, it must have been purchased
            setIsPurchased(true);
          }
        } else {
          // If online, fetch from API
          const courseData = await coursesAPI.getCourseById(id);
          setCourse(courseData);
          
          // Check if the course is purchased
          try {
            const purchasedCourses = await coursesAPI.getPurchasedCourses();
            const isPurchased = purchasedCourses.some(c => c._id === id);
            setIsPurchased(isPurchased);
            
            // If purchased, check consistency for discount
            if (isPurchased) {
              await checkConsistency(id);
            }
          } catch (err) {
            console.error('Error checking if course is purchased:', err);
          }
          
          // Get user progress for this course if it's downloaded
          if (isAvailableOffline) {
            const userCourse = offlineCourses.find(c => c._id === id);
            if (userCourse) {
              setCompletedLessons(userCourse.completedLessons || []);
              setProgress(userCourse.progress || 0);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Failed to load course. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [id, isOnline, isAvailableOffline, offlineCourses, navigate]);
  
  const handleCompleteLesson = async (lessonOrder) => {
    try {
      if (!completedLessons.includes(lessonOrder)) {
        // Call the completeLesson function from OfflineContext
        // This will work both online and offline
        const result = await completeLesson(course._id, lessonOrder);
        
        if (result.success) {
          // Update local state
          setCompletedLessons(prev => [...prev, lessonOrder]);
          
          // Update progress
          const newProgress = course.lessons ? Math.round(((completedLessons.length + 1) / course.lessons.length) * 100) : 0;
          setProgress(newProgress);
          
          // Check consistency for discount
          if (isOnline && isPurchased) {
            await checkConsistency(course._id);
          }
          
          // If all lessons are completed, complete the course
          if (newProgress === 100) {
            await completeCourseAndApplyDiscount(course._id);
            showNotification('Congratulations! You have completed this course!', 'achievement');
          }
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      showNotification('Failed to complete lesson. Please try again.', 'download');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading course...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!course) {
    return <div className="error-message">Course not found</div>;
  }
  // Initialize discount when starting a course
  const handleStartCourse = async () => {
    if (isOnline && isPurchased) {
      try {
        const result = await initializeDiscount(course._id);
        if (result.success) {
          showNotification('You now have a 30% discount for your next course! Complete this course to keep it.', 'achievement');
        }
      } catch (error) {
        console.error('Error initializing discount:', error);
      }
    }
  };
  
  // Function to handle lesson selection and video display
  const handleLessonSelect = async (lesson, index) => {
    setSelectedLesson({ ...lesson, order: index });
    
    // If course is not purchased, just show the lesson title but don't load video
    if (!isPurchased) {
      setVideoError('You need to purchase this course to access lesson content.');
      setActiveVideoUrl('');
      return;
    }
    
    // Initialize discount if this is the first lesson selection
    if (!discountStatus.hasActiveDiscount || 
        discountStatus.activeCourseDiscount?.courseId !== course._id) {
      handleStartCourse();
    }
    
    setVideoLoading(true);
    setVideoError(null);
    
    try {
      // Get the video URL from the lesson
      const videoUrl = lesson.videoUrl || lesson.video;
      
      if (!videoUrl) {
        setVideoError('No video available for this lesson.');
        setActiveVideoUrl('');
        setVideoLoading(false);
        return;
      }
      
      // If we're offline, try to get the video from IndexedDB
      if (!isOnline) {
        // Generate a consistent ID for this video
        const lessonOrder = lesson.order !== undefined ? lesson.order : index;
        const videoId = lesson.videoPublicId || `video_${course._id}_${lessonOrder}`;
        console.log(`Looking for offline video with ID: ${videoId}`);
        
        const offlineVideo = await getVideo(videoId);
        
        if (offlineVideo) {
          console.log(`Found offline video ${videoId}`);
          
          if (offlineVideo.isReference) {
            // This is just a reference, not the actual video
            console.warn(`Video ${videoId} is only a reference due to CORS restrictions`);
            setVideoError('This video could not be downloaded due to security restrictions. Please view it online.');
            setActiveVideoUrl('');
          } else if (offlineVideo.localUrl) {
            // We have the actual video content
            console.log(`Using offline video ${videoId}`);
            setActiveVideoUrl(offlineVideo.localUrl);
          } else {
            // Something is wrong with the video data
            console.error(`Video ${videoId} has invalid data`);
            setVideoError('This video data is corrupted. Please re-download the course.');
            setActiveVideoUrl('');
          }
          setVideoLoading(false);
          return;
        } else {
          // If we're offline but the video isn't available, show an error
          console.error(`Video ${videoId} not found in offline storage`);
          setVideoError('This video is not available offline. Please download the course when online.');
          setActiveVideoUrl('');
          setVideoLoading(false);
          return;
        }
      }
      
      // If we're online, use the original URL
      console.log(`Using online video: ${videoUrl}`);
      setActiveVideoUrl(videoUrl);
    } catch (error) {
      console.error('Error loading video:', error);
      setVideoError('Failed to load video. Please try again.');
      setActiveVideoUrl('');
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="course-detail">
      <div className="course-header">
        <img src={course.image || `https://via.placeholder.com/300x160?text=${encodeURIComponent(course.title)}`} alt={course.title} />
        <div className="course-info">
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="course-price">${course.price || 0}</div>
          
          {!isPurchased && isOnline && (
            <button 
              className="purchase-btn" 
              onClick={async () => {
                try {
                  await coursesAPI.purchaseCourse(course._id);
                  showNotification(`Course '${course.title}' purchased successfully!`, 'achievement');
                  setIsPurchased(true);
                } catch (error) {
                  console.error('Error purchasing course:', error);
                  showNotification('Failed to purchase course. Please try again.', 'download');
                }
              }}
            >
              Purchase Course
            </button>
          )}
          
          {isPurchased && (
            <>
              <div className="progress-info">
                <p><strong>Progress: {progress}%</strong></p>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
              
              {/* Show discount meter if this is the active course */}
              {discountStatus.hasActiveDiscount && 
               discountStatus.activeCourseDiscount?.courseId === course._id && (
                <div className="course-discount-meter">
                  <DiscountMeter courseId={course._id} showDetails={false} />
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleStartCourse}
                  >
                    Refresh Discount
                  </button>
                </div>
              )}
            </>
          )}
          
          {isAvailableOffline && (
            <div className="badge badge-streak">Available Offline</div>
          )}
        </div>
      </div>
      
      <div className="course-content-container">
        {/* Video Player Section (Left) */}
        <div className="video-container">
          {selectedLesson ? (
            <>
              <h2>{selectedLesson.title}</h2>
              {!isPurchased ? (
                <div className="purchase-required">
                  <div className="video-error">
                    <p>You need to purchase this course to access lesson content.</p>
                    <button 
                      className="purchase-btn" 
                      onClick={async () => {
                        try {
                          await coursesAPI.purchaseCourse(course._id);
                          showNotification(`Course '${course.title}' purchased successfully!`, 'achievement');
                          setIsPurchased(true);
                        } catch (error) {
                          console.error('Error purchasing course:', error);
                          showNotification('Failed to purchase course. Please try again.', 'download');
                        }
                      }}
                      disabled={!isOnline}
                    >
                      Purchase Course
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="video-container">
                    {videoLoading ? (
                      <div className="video-loading">
                        <p>Loading video...</p>
                      </div>
                    ) : videoError ? (
                      <div className="video-error">
                        <p>{videoError}</p>
                      </div>
                    ) : activeVideoUrl ? (
                      <video
                        controls
                        className="lesson-video"
                        src={activeVideoUrl}
                        poster={course.image}
                      />
                    ) : (
                      <div className="video-placeholder">
                        <img src={course.image} alt={course.title} />
                        <div className="placeholder-text">
                          <p>Select a lesson to start learning</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="lesson-content">
                    <h3>Description</h3>
                    <p>{selectedLesson.description}</p>
                    
                    {selectedLesson.content && (
                      <div className="lesson-text-content">
                        <h3>Content</h3>
                        <p>{selectedLesson.content}</p>
                      </div>
                    )}
                    
                    {!completedLessons.includes(selectedLesson.order) && (
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleCompleteLesson(selectedLesson.order)}
                        disabled={!isOnline}
                      >
                        Mark as Complete
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="select-lesson-prompt">
              <h2>Select a lesson</h2>
              <p>Please select a lesson from the list on the right to start learning.</p>
              <img 
                src={`https://via.placeholder.com/640x360?text=${encodeURIComponent('Select a lesson')}`} 
                alt="Select a lesson" 
              />
            </div>
          )}
        </div>
        
        {/* Lessons List Section (Right) */}
        <div className="lessons-sidebar">
          <h2 className="sidebar-title">Course Lessons</h2>
          {course.lessons && course.lessons.length > 0 ? (
            <ul className="lessons-list">
              {course.lessons.map((lesson, index) => (
                <li 
                  key={index} 
                  className={`lesson-item ${selectedLesson && selectedLesson.order === index ? 'active' : ''}`}
                  onClick={() => handleLessonSelect(lesson, index)}
                >
                  <div className="lesson-item-content">
                    <span className="lesson-number">{index + 1}</span>
                    <div className="lesson-details">
                      <h3>{lesson.title}</h3>
                      {isPurchased && (
                        <>
                          <p>{lesson.description.substring(0, 60)}...</p>
                          
                          <div className="lesson-meta">
                            {lesson.videoUrl && (
                              <span className="video-indicator">
                                <i className="video-icon">▶</i> Video
                              </span>
                            )}
                            
                            {lesson.duration > 0 && (
                              <span className="duration">{Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}</span>
                            )}
                            
                            {completedLessons.includes(index) && (
                              <span className="badge badge-success">Completed</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No lessons available for this course.</p>
          )}
        </div>
      </div>
      
      <Link to="/courses" className="btn btn-secondary back-button">Back to Courses</Link>
    </div>
  );
};

export default CourseDetail;
