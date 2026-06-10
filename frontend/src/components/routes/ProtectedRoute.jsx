// frontend/src/components/routes/ProtectedRoute.jsx
//
// Redirects to /login if the user is not authenticated.
// Uses AuthContext instead of checking localStorage('token') —
// which was the root cause of the broken route guards.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
