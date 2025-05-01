import React, { createContext, useState, useEffect } from 'react';
import { showNotification } from '../components/NotificationManager';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is already logged in on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Get user data from the API
      const fetchUser = async () => {
        try {
          const response = await authAPI.getUser();
          setCurrentUser(response.user);
        } catch (error) {
          console.error('Error fetching user:', error);
          // If token is invalid or expired, clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);
  
  // Register function
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the API to register the user
      const response = await authAPI.register({ name, email, password });
      
      // Store token in localStorage
      localStorage.setItem('token', response.token);
      
      // Update state
      setCurrentUser(response.user);
      showNotification('Registration successful! Welcome to Cubic E-Learning', 'achievement');
      
      return response.user;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      showNotification(`Registration failed: ${errorMessage}`, 'download');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the API to login the user
      const response = await authAPI.login({ email, password });
      
      // Store token in localStorage
      localStorage.setItem('token', response.token);
      
      // Update state
      setCurrentUser(response.user);
      showNotification(`Welcome back, ${response.user.name}!`, 'achievement');
      
      return response.user;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      showNotification(`Login failed: ${errorMessage}`, 'download');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    showNotification('You have been logged out', 'points');
  };
  
  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
