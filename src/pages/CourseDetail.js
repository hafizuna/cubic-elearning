import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import { showNotification } from '../components/NotificationManager';
import OfflineContext from '../context/OfflineContext';
import { getVideo } from '../services/progressService';
import AIAssistant from '../components/AIAssistant';

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
  
  // Use the offline context
  const { isOnline, offlineCourses, completeLesson, isCourseAvailableOffline } = useContext(OfflineContext);
  
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
          }
        } else {
          // If online, fetch from API
          const courseData = await coursesAPI.getCourseById(id);
          setCourse(courseData);
          
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
          
          // Show success notification
          showNotification('Lesson completed! +5 points', 'achievement');
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      showNotification('Failed to complete lesson. Please try again.', 'download');
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
    <div className="course-detail-page">
      {/* Hero Section with Course Info */}
      <div className="course-hero" style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${course.image || `https://via.placeholder.com/1200x400?text=${encodeURIComponent(course.title)}`})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="course-hero-content">
          <h1 className="course-title">{course.title}</h1>
          <p className="course-description">{course.description}</p>
          
          <div className="course-meta">
            <div className="course-progress">
              <div className="progress-label">
                <span>Your Progress</span>
                <span className="progress-percentage">{progress}%</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            
            <div className="course-badges">
              {isAvailableOffline && (
                <div className="badge badge-offline">
                  <span className="badge-icon">📱</span>
                  <span>Available Offline</span>
                </div>
              )}
              
              <div className="badge badge-lessons">
                <span className="badge-icon">📚</span>
                <span>{course.lessons ? course.lessons.length : 0} Lessons</span>
              </div>
              
              {completedLessons.length > 0 && (
                <div className="badge badge-completed">
                  <span className="badge-icon">✅</span>
                  <span>{completedLessons.length} Completed</span>
                </div>
              )}
            </div>
          </div>
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
                  <div className="lesson-number">{index + 1}</div>
                  <div className="lesson-info">
                    <h3 className="lesson-title">{lesson.title}</h3>
                    {lesson.duration && (
                      <span className="lesson-duration">
                        <span className="duration-icon">⏱️</span>
                        <span>{Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}</span>
                      </span>
                    )}
                  </div>
                  {completedLessons.includes(index) && (
                    <div className="lesson-status">
                      <span className="status-icon completed-icon">✓</span>
                    </div>
                  )}
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
