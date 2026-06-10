// frontend/src/context/AuthContext.js
//
// Centralized authentication context.
// Replaces the fragmented localStorage access and window event pattern
// used across Header, Login, Register, App.js route guards, and dashboards.
//
// Auth state source of truth: localStorage 'user' key (contains { id, name, role }).
// JWT lives in an httpOnly cookie managed by the server — never touched by JS.

import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import axios from '../api/axios';

export const AuthContext = createContext(null);

// Parse the user object from localStorage safely.
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  // ── Sync across tabs via the native `storage` event ──────────────────────
  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === 'user') {
        setUser(readStoredUser());
      }
    };
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Store user data after a successful login or register API call.
   * The httpOnly cookie is already set by the server at this point.
   */
  const login = useCallback((userData) => {
    const userToStore = {
      id:   userData.id,
      name: userData.name,
      role: userData.role,
    };
    localStorage.setItem('user', JSON.stringify(userToStore));
    setUser(userToStore);
  }, []);

  /**
   * Clear auth state. Calls POST /auth/logout to clear the httpOnly cookie,
   * then cleans up localStorage. Fire-and-forget on the API call — we always
   * clear local state even if the request fails.
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await axios.post('/auth/logout');
    } catch {
      // Non-fatal — proceed with local cleanup regardless.
      // Worst case: orphaned cookie that expires in 30 days.
    } finally {
      localStorage.removeItem('user');
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // ── Context value (memoized to prevent unnecessary re-renders) ──────────
  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
