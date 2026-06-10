// frontend/src/hooks/useAuth.js
//
// Convenience re-export so components can do:
//   import { useAuth } from '../hooks/useAuth';
// instead of importing the context directly.

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
