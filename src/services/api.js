import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API calls
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  login: async (credentials) => {
    console.log('Sending login request with credentials:', credentials);
    const response = await api.post('/auth/login', credentials);
    console.log('Login response:', response.data);
    return response.data;
  },
  getUser: async () => {
    const response = await api.get('/auth/user');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Courses API calls
export const coursesAPI = {
  getAllCourses: async () => {
    const response = await api.get('/courses');
    return response.data;
  },
  getCourseById: async (courseId) => {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  },
  downloadCourse: async (courseId) => {
    const response = await api.post(`/courses/${courseId}/download`);
    return response.data;
  },
  completeLesson: async (courseId, lessonOrder) => {
    const response = await api.post(`/courses/${courseId}/complete-lesson`, { lessonOrder });
    return response.data;
  },
  getDownloadedCourses: async () => {
    const response = await api.get('/courses/user/downloaded');
    return response.data;
  }
};

// User API calls
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
  getProgress: async () => {
    const response = await api.get('/users/progress');
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get('/users/notifications');
    return response.data;
  },
  markNotificationsAsRead: async (notificationIds) => {
    const response = await api.put('/users/notifications/read', { notificationIds });
    return response.data;
  },
  getUserActivity: async () => {
    const response = await api.get('/users/activity');
    return response.data;
  }
};

// Admin API calls
export const adminAPI = {
  // Course management
  getAllCourses: async () => {
    const response = await api.get('/admin/courses');
    return response.data;
  },
  createCourse: async (courseData) => {
    // Using FormData for file uploads
    const formData = new FormData();
    
    // Append text fields
    Object.keys(courseData).forEach(key => {
      if (key !== 'image') {
        formData.append(key, courseData[key]);
      }
    });
    
    // Append image file if it exists
    if (courseData.image && courseData.image instanceof File) {
      formData.append('image', courseData.image);
    }
    
    const response = await api.post('/admin/courses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  updateCourse: async (courseId, courseData) => {
    // Using FormData for file uploads
    const formData = new FormData();
    
    // Append text fields
    Object.keys(courseData).forEach(key => {
      if (key !== 'image') {
        formData.append(key, courseData[key]);
      }
    });
    
    // Append image file if it exists
    if (courseData.image && courseData.image instanceof File) {
      formData.append('image', courseData.image);
    }
    
    const response = await api.put(`/admin/courses/${courseId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  deleteCourse: async (courseId) => {
    const response = await api.delete(`/admin/courses/${courseId}`);
    return response.data;
  },
  
  // Lesson management
  addLesson: async (courseId, lessonData) => {
    // Using FormData for file uploads
    const formData = new FormData();
    
    // Append text fields
    Object.keys(lessonData).forEach(key => {
      if (key !== 'video') {
        formData.append(key, lessonData[key]);
      }
    });
    
    // Append video file if it exists
    if (lessonData.video && lessonData.video instanceof File) {
      formData.append('video', lessonData.video);
    }
    
    const response = await api.post(`/admin/courses/${courseId}/lessons`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  updateLesson: async (courseId, lessonId, lessonData) => {
    // Using FormData for file uploads
    const formData = new FormData();
    
    // Append text fields
    Object.keys(lessonData).forEach(key => {
      if (key !== 'video') {
        formData.append(key, lessonData[key]);
      }
    });
    
    // Append video file if it exists
    if (lessonData.video && lessonData.video instanceof File) {
      formData.append('video', lessonData.video);
    }
    
    const response = await api.put(`/admin/courses/${courseId}/lessons/${lessonId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  deleteLesson: async (courseId, lessonId) => {
    const response = await api.delete(`/admin/courses/${courseId}/lessons/${lessonId}`);
    return response.data;
  }
};

// AI Assistant API calls
export const aiAPI = {
  askQuestion: async (prompt, courseId = null) => {
    const response = await api.post('/ai/ask', { prompt, courseId });
    return response.data;
  },
  getCourseSummary: async (courseId) => {
    const response = await api.post('/ai/course-summary', { courseId });
    return response.data;
  }
};

export default api;
