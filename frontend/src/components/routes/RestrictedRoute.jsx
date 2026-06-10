// frontend/src/components/routes/RestrictedRoute.jsx
//
// Requires authentication + a specific role.
// Redirects to /login if not authenticated, or to /restaurants if role doesn't match.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RestrictedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/restaurants" replace />;
  }

  return children;
};

export default RestrictedRoute;
