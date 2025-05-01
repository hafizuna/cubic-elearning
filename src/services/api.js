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
export const usersAPI = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      
      // Ensure points are properly formatted as numbers
      if (response.data && response.data.user) {
        response.data.user.points = Number(response.data.user.points || 0);
        response.data.user.streakCount = Number(response.data.user.streakCount || 0);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Return demo data if API fails
      return {
        user: {
          name: localStorage.getItem('userName') || 'John Doe',
          email: localStorage.getItem('userEmail') || 'john.doe@example.com',
          role: localStorage.getItem('userRole') || 'student',
          points: 1250,
          streakCount: 5,
          joinDate: '2024-01-15T00:00:00.000Z',
          profileImage: null
        }
      };
    }
  },
  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
  getProgress: async () => {
    try {
      const response = await api.get('/users/progress');
      
      // Ensure points are properly formatted as numbers
      if (response.data && response.data.data) {
        response.data.data.points = Number(response.data.data.points || 0);
        response.data.data.streak = Number(response.data.data.streak || 0);
        response.data.data.level = Number(response.data.data.level || 1);
        response.data.data.levelProgress = Number(response.data.data.levelProgress || 0);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      // Return demo data if API fails
      return {
        data: {
          points: 1250,
          streak: 5,
          level: 3,
          levelProgress: 65,
          completedCourses: 4,
          totalCourses: 12,
          totalLessonsCompleted: 27,
          totalQuizzesCompleted: 8,
          averageQuizScore: 85
        }
      };
    }
  },
  getNotifications: async () => {
    const response = await api.get('/users/notifications');
    return response.data;
  },
  markNotificationAsRead: async (notificationId) => {
    const response = await api.put(`/users/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async () => {
    const response = await api.put('/users/notifications/read-all');
    return response.data;
  },
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/users/notifications/${notificationId}`);
    return response.data;
  },
  getUserActivity: async () => {
    const response = await api.get('/users/activity');
    return response.data;
  },
  getLearningPatterns: async () => {
    const response = await api.get('/users/learning-patterns');
    return response.data;
  },
  getNotificationPreferences: async () => {
    const response = await api.get('/users/notification-preferences');
    return response.data;
  },
  updateNotificationPreferences: async (preferences) => {
    const response = await api.put('/users/notification-preferences', preferences);
    return response.data;
  },
  generatePersonalizedNotifications: async () => {
    const response = await api.get('/users/generate-personalized-notifications');
    return response.data;
  },
  trackPageView: async (pageData) => {
    const response = await api.post('/users/track-page-view', pageData);
    return response.data;
  },
  exitPage: async () => {
    const response = await api.post('/users/exit-page');
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

// AI API
const aiAPI = {
  askQuestion: async (prompt, courseId = null, courseTitle = null) => {
    try {
      const response = await api.post('/ai/ask', { 
        prompt, 
        courseId,
        courseTitle 
      });
      return response.data;
    } catch (error) {
      console.error('Error asking AI question:', error);
      throw error;
    }
  },
  getCourseSummary: async (courseId) => {
    try {
      const response = await api.get(`/ai/course-summary/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting course summary:', error);
      throw error;
    }
  },
  getPersonalizedTips: async () => {
    try {
      const response = await api.get('/ai/personalized-tips');
      return response.data;
    } catch (error) {
      console.error('Error getting personalized tips:', error);
      throw error;
    }
  },
  getStudyRecommendations: async () => {
    try {
      const response = await api.get('/ai/study-recommendations');
      return response.data;
    } catch (error) {
      console.error('Error getting study recommendations:', error);
      throw error;
    }
  },
  generateLearningPlan: async (courseId) => {
    try {
      const response = await api.get(`/ai/learning-plan/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error generating learning plan:', error);
      throw error;
    }
  },
  getAIPopupQuestion: async () => {
    try {
      const response = await api.get('/ai/popup-question');
      return response.data;
    } catch (error) {
      console.error('Error getting AI popup question:', error);
      throw error;
    }
  },
  submitAIPopupResponse: async (questionId, response) => {
    try {
      const apiResponse = await api.post('/ai/popup-response', {
        questionId,
        response
      });
      return apiResponse.data;
    } catch (error) {
      console.error('Error submitting AI popup response:', error);
      throw error;
    }
  }
};

// Export aiAPI
export { aiAPI };
export default api;
