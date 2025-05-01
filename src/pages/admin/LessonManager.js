import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI, coursesAPI } from '../../services/api';
import { showNotification } from '../../components/NotificationManager';

const LessonManager = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  
  // Form state for adding/editing lessons
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    content: '',
    order: 0,
    video: null
  });
  
  // Video preview state
  const [videoPreview, setVideoPreview] = useState(null);
  
  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        // Use the admin API to get full course details
        const coursesData = await adminAPI.getAllCourses();
        const course = coursesData.find(c => c._id === courseId);
        
        if (course) {
          setCourse(course);
          // Set the next lesson order to be the length of existing lessons
          setLessonForm(prev => ({
            ...prev,
            order: course.lessons?.length || 0
          }));
        } else {
          setError('Course not found');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [courseId]);
  
  const resetLessonForm = () => {
    setLessonForm({
      title: '',
      description: '',
      content: '',
      order: course?.lessons?.length || 0,
      video: null
    });
    setVideoPreview(null);
    setEditingLessonId(null);
  };
  
  const handleLessonChange = (e) => {
    const { name, value } = e.target;
    setLessonForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is a video
      if (!file.type.startsWith('video/')) {
        showNotification('Please select a valid video file', 'download');
        return;
      }
      
      setLessonForm(prev => ({
        ...prev,
        video: file
      }));
      
      // Create a preview URL for the selected video
      const videoURL = URL.createObjectURL(file);
      setVideoPreview(videoURL);
    }
  };
  
  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!lessonForm.title.trim() || !lessonForm.content.trim()) {
      showNotification('Title and content are required', 'download');
      return;
    }
    
    try {
      setLoading(true);
      
      if (editingLessonId) {
        // Update existing lesson
        const updatedCourse = await adminAPI.updateLesson(
          courseId,
          editingLessonId,
          lessonForm
        );
        setCourse(updatedCourse);
        showNotification('Lesson updated successfully', 'achievement');
      } else {
        // Add new lesson
        const updatedCourse = await adminAPI.addLesson(courseId, lessonForm);
        setCourse(updatedCourse);
        showNotification('Lesson added successfully', 'achievement');
      }
      
      // Reset form and hide it
      resetLessonForm();
      setShowLessonForm(false);
    } catch (err) {
      console.error('Error saving lesson:', err);
      showNotification(`Failed to ${editingLessonId ? 'update' : 'add'} lesson`, 'download');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditLesson = (lesson) => {
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      content: lesson.content,
      order: lesson.order,
      video: null // We don't load the video file, just display the preview
    });
    
    setVideoPreview(lesson.videoUrl);
    setEditingLessonId(lesson._id);
    setShowLessonForm(true);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      try {
        setLoading(true);
        const updatedCourse = await adminAPI.deleteLesson(courseId, lessonId);
        setCourse(updatedCourse);
        showNotification('Lesson deleted successfully', 'achievement');
      } catch (err) {
        console.error('Error deleting lesson:', err);
        showNotification('Failed to delete lesson', 'download');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  if (loading && !course) return <div className="loading">Loading course data...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!course) return <div className="error-message">Course not found</div>;
  
  return (
    <div className="lesson-manager">
      <div className="lesson-manager-header">
        <h1>Manage Lessons: {course.title}</h1>
        <div className="lesson-manager-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/admin')}
          >
            Back to Courses
          </button>
          {!showLessonForm && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                resetLessonForm();
                setShowLessonForm(true);
              }}
            >
              Add New Lesson
            </button>
          )}
        </div>
      </div>
      
      {showLessonForm && (
        <div className="card lesson-form">
          <h2>{editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}</h2>
          <form onSubmit={handleLessonSubmit}>
            <div className="form-group">
              <label htmlFor="title">Lesson Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={lessonForm.title}
                onChange={handleLessonChange}
                placeholder="Enter lesson title"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={lessonForm.description}
                onChange={handleLessonChange}
                placeholder="Enter lesson description (optional)"
                rows="2"
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="content">Lesson Content *</label>
              <textarea
                id="content"
                name="content"
                value={lessonForm.content}
                onChange={handleLessonChange}
                placeholder="Enter lesson content"
                rows="10"
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="order">Lesson Order</label>
              <input
                type="number"
                id="order"
                name="order"
                value={lessonForm.order}
                onChange={handleLessonChange}
                min="0"
              />
              <p className="form-help">The order in which this lesson appears in the course</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="video">Lesson Video</label>
              <input
                type="file"
                id="video"
                name="video"
                accept="video/*"
                onChange={handleVideoChange}
              />
              <p className="form-help">Upload a video for this lesson (MP4, MOV, AVI formats)</p>
              
              {videoPreview && (
                <div className="video-preview">
                  <video controls src={videoPreview} width="100%"></video>
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  resetLessonForm();
                  setShowLessonForm(false);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
              >
                {loading ? 'Saving...' : (editingLessonId ? 'Update Lesson' : 'Add Lesson')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Course Lessons</h2>
        
        {course.lessons?.length === 0 ? (
          <div className="empty-state">
            <p>This course doesn't have any lessons yet.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowLessonForm(true)}
            >
              Add Your First Lesson
            </button>
          </div>
        ) : (
          <div className="lessons-list">
            {course.lessons?.sort((a, b) => a.order - b.order).map((lesson, index) => (
              <div key={lesson._id} className="lesson-item">
                <div className="lesson-number">{index + 1}</div>
                <div className="lesson-content">
                  <h3>{lesson.title}</h3>
                  {lesson.description && <p>{lesson.description}</p>}
                  
                  {lesson.videoUrl && (
                    <div className="lesson-video-info">
                      <span className="video-badge">
                        <i className="fas fa-video"></i> Video
                      </span>
                      <span className="video-duration">
                        {formatDuration(lesson.duration)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="lesson-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEditLesson(lesson)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteLesson(lesson._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonManager;
