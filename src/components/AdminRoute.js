import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * AdminRoute component to protect admin-only routes
 * Redirects to login if not authenticated or to dashboard if authenticated but not admin
 */
const AdminRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  // Show loading while checking authentication
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // If authenticated but not admin, redirect to dashboard
  if (currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  // If admin, render the protected component
  return children;
};

export default AdminRoute;
