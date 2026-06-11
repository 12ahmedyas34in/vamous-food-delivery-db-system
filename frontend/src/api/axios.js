// frontend/src/api/axios.js
//
//   - withCredentials: true — sends httpOnly cookie on every request
//   - Authorization header interceptor removed — token is now in the cookie
//   - 401 response interceptor kept — still handles session expiry

import axios from 'axios';

const instance = axios.create({
  baseURL:         process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,   // send cookie on every request
});

// Request interceptor — no longer attaches token (cookie handles it)
// Kept in place in case we need to attach other headers in future
instance.interceptors.request.use(
  (config) => config,
  (error)  => Promise.reject(error)
);

// Response interceptor — session expiry handler unchanged
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRoute = error.config && error.config.url.includes('/auth/login');

    if (error.response && error.response.status === 401 && !isLoginRoute) {
      alert('Your session has expired or access is denied. Please log in again.');
      localStorage.removeItem('user');   // token no longer in localStorage
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
