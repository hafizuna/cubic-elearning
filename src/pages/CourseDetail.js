import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import { showNotification } from '../components/NotificationManager';
import OfflineContext from '../context/OfflineContext';
import { DiscountContext } from '../context/DiscountContext';
import { getVideo } from '../services/progressService';
import DiscountMeter from '../components/DiscountMeter';
import '../components/DiscountMeter.css';
import AIAssistant from '../components/AIAssistant';
import './CourseDetail.css';

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
          
          // Show success notification
          showNotification('Lesson completed! +5 points', 'achievement');
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      showNotification('Failed to complete lesson. Please try again.', 'download');
    }
  };
  
  // Function to handle opening Telegram bot
  const handleOpenTelegramBot = () => {
    // Construct the Telegram bot URL with the token
    const botToken = '7550433515:AAGMGXVNOYst7msCozkf7deaCtesdoODbMM';
    const botUsername = 'EduBoostdirebot'; // Updated to the correct bot username
    
    // Create a simple string parameter with just the course ID
    // This is more reliable than passing a complex JSON object
    const startParam = course._id;
    
    // Create the Telegram URL with the start parameter
    const telegramUrl = `https://t.me/${botUsername}?start=${startParam}`;
    
    console.log('Opening Telegram bot with URL:', telegramUrl);
    
    // Open the URL in a new tab
    window.open(telegramUrl, '_blank');
    
    // Show notification to the user
    showNotification('Continuing your learning in Telegram!', 'achievement');
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
  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your course...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <h2>Oops! Something went wrong</h2>
      <p>{error}</p>
      <Link to="/courses" className="btn btn-primary">Back to Courses</Link>
    </div>
  );
  
  if (!course) return (
    <div className="error-container">
      <div className="error-icon">🔍</div>
      <h2>Course Not Found</h2>
      <p>We couldn't find the course you're looking for.</p>
      <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
    </div>
  );
  
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
          
          {/* Telegram Bot Button */}
          <button 
            className="telegram-btn" 
            onClick={handleOpenTelegramBot}
          >
            <i className="telegram-icon"></i>
            Continue Learning in Telegram
          </button>
          
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
              disabled={!isOnline}
            >
              Purchase Course
            </button>
          )}
          
          {!isOnline && !isAvailableOffline && (
            <div className="offline-message">
              <p>You are currently offline. This course is not available offline.</p>
            </div>
          )}
          
          {isAvailableOffline && (
            <div className="badge badge-streak">Available Offline</div>
          )}
        </div>
      </div>
      
      <div className="course-content-wrapper">
        <div className="course-content-container">
          {/* Video Player Section (Left) */}
          <div className="video-section">
            {selectedLesson ? (
              <div className="active-lesson">
                <div className="lesson-header">
                  <h2 className="lesson-title">{selectedLesson.title}</h2>
                  {selectedLesson.description && (
                    <p className="lesson-description">{selectedLesson.description}</p>
                  )}
                </div>
                
                <div className="video-container">
                  {videoLoading ? (
                    <div className="video-loading">
                      <div className="loading-spinner"></div>
                      <p>Loading video...</p>
                    </div>
                  ) : videoError ? (
                    <div className="video-error">
                      <div className="error-icon">⚠️</div>
                      <p>{videoError}</p>
                    </div>
                  ) : activeVideoUrl ? (
                    <video
                      controls
                      className="video-player"
                      src={activeVideoUrl}
                      controlsList="nodownload"
                      poster={course.image}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="video-error">
                      <div className="error-icon">🎬</div>
                      <p>No video available for this lesson.</p>
                    </div>
                  )}
                </div>
                
                <div className="lesson-actions">
                  <button 
                    className={`btn ${completedLessons.includes(selectedLesson.order) ? 'btn-success' : 'btn-primary'}`}
                    onClick={() => handleCompleteLesson(selectedLesson.order)}
                    disabled={completedLessons.includes(selectedLesson.order)}
                  >
                    {completedLessons.includes(selectedLesson.order) ? (
                      <>
                        <span className="btn-icon">✓</span>
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">✓</span>
                        <span>Mark as Complete</span>
                      </>
                    )}
                  </button>
                  
                  <div className="lesson-navigation">
                    {selectedLesson.order > 0 && (
                      <button 
                        className="btn btn-outline"
                        onClick={() => handleLessonSelect(course.lessons[selectedLesson.order - 1], selectedLesson.order - 1)}
                      >
                        <span className="btn-icon">←</span>
                        <span>Previous</span>
                      </button>
                    )}
                    
                    {selectedLesson.order < course.lessons.length - 1 && (
                      <button 
                        className="btn btn-outline"
                        onClick={() => handleLessonSelect(course.lessons[selectedLesson.order + 1], selectedLesson.order + 1)}
                      >
                        <span>Next</span>
                        <span className="btn-icon">→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-lesson-selected">
                <div className="empty-state-icon">📺</div>
                <h2>Select a Lesson to Begin</h2>
                <p>Choose a lesson from the list to start your learning journey.</p>
              </div>
            )}
          </div>
          
          {/* Lessons List (Right) */}
          <div className="lessons-sidebar">
            <div className="lessons-header">
              <h2>Course Curriculum</h2>
              <div className="lessons-count">
                <span>{completedLessons.length}</span> / <span>{course.lessons ? course.lessons.length : 0}</span> completed
              </div>
            </div>
            
            <ul className="lessons-list">
              {course.lessons && course.lessons.map((lesson, index) => (
                <li 
                  key={index} 
                  className={`lesson-item ${selectedLesson && selectedLesson.order === index ? 'active' : ''} ${completedLessons.includes(index) ? 'completed' : ''}`}
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
                    {completedLessons.includes(index) && (
                      <div className="lesson-status">
                        <span className="status-icon completed-icon">✓</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="lessons-footer">
              <Link to="/courses" className="btn btn-outline btn-full">
                <span className="btn-icon">←</span>
                <span>Back to Courses</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* AI Assistant */}
        <div className="ai-assistant-sidebar">
          <AIAssistant courseId={id} courseTitle={course.title} />
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
