import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import OfflineContext from '../context/OfflineContext';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use the offline context
  const { isOnline, offlineCourses, downloadCourse, removeOfflineCourse, isDownloading } = useContext(OfflineContext);

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const courses = await coursesAPI.getAllCourses();
        setCourses(courses);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);
  const [actionInProgress, setActionInProgress] = useState(false);

  const handleDownload = async (course) => {
    if (isOnline) {
      setActionInProgress(true);
      await downloadCourse(course);
      setActionInProgress(false);
    } else {
      alert('You need to be online to download new courses');
    }
  };
  
  const handleRemoveDownload = async (courseId, title) => {
    if (window.confirm(`Are you sure you want to remove ${title} from offline storage? You will need to download it again to access it offline.`)) {
      setActionInProgress(true);
      await removeOfflineCourse(courseId);
      setActionInProgress(false);
    }
  };

  const isDownloaded = (courseId) => {
    return offlineCourses.some(course => course._id === courseId);
  };

  return (
    <div className="courses-page">
      <h1>Available Courses</h1>
      
      {!isOnline && (
        <div className="card">
          <p><strong>You are currently offline.</strong> Only downloaded courses will be available.</p>
        </div>
      )}
      
      {loading ? (
        <div className="loading">Loading courses...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course._id} className="card course-card">
              {isDownloaded(course._id) && <div className="downloaded-badge">Available Offline</div>}
              <img src={course.image || `https://via.placeholder.com/300x160?text=${encodeURIComponent(course.title)}`} alt={course.title} className="course-image" />
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <p><strong>{course.lessons?.length || 0} Lessons</strong></p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Link to={`/courses/${course._id}`} className="btn btn-primary">
                  {isDownloaded(course._id) ? 'Continue Learning' : 'View Course'}
                </Link>
                {!isDownloaded(course._id) ? (
                  <button 
                    className="download-btn" 
                    onClick={() => handleDownload(course)}
                    disabled={!isOnline || actionInProgress}
                  >
                    {actionInProgress ? 'Downloading...' : 'Download for Offline'}
                  </button>
                ) : (
                  <button 
                    className="remove-download-btn" 
                    onClick={() => handleRemoveDownload(course._id, course.title)}
                    disabled={actionInProgress}
                  >
                    Remove Download
                  </button>
                )}
              </div>
            </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
