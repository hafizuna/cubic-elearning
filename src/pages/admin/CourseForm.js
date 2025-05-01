import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { showNotification } from '../../components/NotificationManager';

const CourseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'Beginner',
    image: null
  });
  
  // Fetch course data if editing
  useEffect(() => {
    if (isEditing) {
      const fetchCourse = async () => {
        try {
          setLoading(true);
          const courseData = await adminAPI.getAllCourses();
          const course = courseData.find(c => c._id === id);
          
          if (course) {
            setFormData({
              title: course.title,
              description: course.description,
              category: course.category || 'General',
              difficulty: course.difficulty || 'Beginner',
              image: null // We don't load the image file, just display the preview
            });
            
            setImagePreview(course.image);
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
    }
  }, [id, isEditing]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim() || !formData.description.trim()) {
      showNotification('Title and description are required', 'download');
      return;
    }
    
    try {
      setSaving(true);
      
      if (isEditing) {
        await adminAPI.updateCourse(id, formData);
        showNotification('Course updated successfully', 'achievement');
      } else {
        await adminAPI.createCourse(formData);
        showNotification('Course created successfully', 'achievement');
      }
      
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err) {
      console.error('Error saving course:', err);
      showNotification(`Failed to ${isEditing ? 'update' : 'create'} course`, 'download');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div className="loading">Loading course data...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="course-form-container">
      <h1>{isEditing ? 'Edit Course' : 'Create New Course'}</h1>
      
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Course Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter course title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter course description"
            rows="4"
            required
          ></textarea>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="General">General</option>
              <option value="Programming">Programming</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="Languages">Languages</option>
              <option value="Arts">Arts</option>
              <option value="Business">Business</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="difficulty">Difficulty Level</label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="image">Course Image</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
          />
          <p className="form-help">Recommended size: 500x300 pixels</p>
          
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Course preview" />
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/admin')}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;
