import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { showNotification } from '../../components/NotificationManager';

const AdminDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useContext(AuthContext);

  // Fetch all courses (including unpublished) for admin
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await adminAPI.getAllCourses();
        setCourses(coursesData);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await adminAPI.deleteCourse(courseId);
        setCourses(courses.filter(course => course._id !== courseId));
        showNotification('Course deleted successfully', 'achievement');
      } catch (err) {
        console.error('Error deleting course:', err);
        showNotification('Failed to delete course', 'download');
      }
    }
  };

  const handleTogglePublish = async (course) => {
    try {
      const updatedCourse = await adminAPI.updateCourse(course._id, {
        published: !course.published
      });
      
      // Update the course in the state
      setCourses(courses.map(c => 
        c._id === updatedCourse._id ? updatedCourse : c
      ));
      
      showNotification(
        `Course ${updatedCourse.published ? 'published' : 'unpublished'} successfully`, 
        'achievement'
      );
    } catch (err) {
      console.error('Error updating course:', err);
      showNotification('Failed to update course', 'download');
    }
  };

  if (loading) return <div className="loading">Loading courses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {currentUser?.name}! Manage your courses and lessons here.</p>
      </div>
      
      <div className="admin-actions">
        <Link to="/admin/courses/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> Create New Course
        </Link>
      </div>
      
      <div className="card">
        <h2 className="card-title">Your Courses</h2>
        
        {courses.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any courses yet.</p>
            <Link to="/admin/courses/new" className="btn btn-primary">Create Your First Course</Link>
          </div>
        ) : (
          <div className="admin-courses-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Lessons</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course._id} className={!course.published ? 'unpublished' : ''}>
                    <td>
                      <div className="course-info">
                        <img 
                          src={course.image || `https://via.placeholder.com/50x50?text=${encodeURIComponent(course.title)}`} 
                          alt={course.title} 
                          className="course-thumbnail" 
                        />
                        <span>{course.title}</span>
                      </div>
                    </td>
                    <td>{course.category || 'General'}</td>
                    <td>{course.difficulty || 'Beginner'}</td>
                    <td>{course.lessons?.length || 0}</td>
                    <td>
                      <span className={`status-badge ${course.published ? 'published' : 'draft'}`}>
                        {course.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="actions">
                      <Link to={`/admin/courses/${course._id}`} className="btn btn-sm btn-secondary">
                        Edit
                      </Link>
                      <Link to={`/admin/courses/${course._id}/lessons`} className="btn btn-sm btn-primary">
                        Lessons
                      </Link>
                      <button 
                        className={`btn btn-sm ${course.published ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleTogglePublish(course)}
                      >
                        {course.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteCourse(course._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
