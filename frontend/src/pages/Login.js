// frontend/src/pages/Login.js
//
// Phase 3 Push 4 changes:
//   - No longer stores token in localStorage (token is now in httpOnly cookie)
//   - Still stores user object (id, name, role) for UI gating and RestrictedRoute
//   - response.data.token removed from the read — login response no longer sends it

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';

const Login = () => {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/login', { email, password });

      // Token is now in the httpOnly cookie set by the server — do NOT store it
      // Store only the user object for UI gating (role checks, display name)
      localStorage.setItem('user', JSON.stringify({
        id:   response.data.user.id,
        name: response.data.user.name,
        role: response.data.user.role,
      }));

      window.dispatchEvent(new Event('auth-change'));
      navigate('/restaurants');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'Arial' }}>
      <h2>Login to Order Food</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '10px',
            backgroundColor: isLoading ? '#ccc' : '#000',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <br />
      <Link to="/register">Don't have an account? Register</Link>
    </div>
  );
};

export default Login;
