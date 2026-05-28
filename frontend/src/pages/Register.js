import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/register', { 
        full_name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim()
      });

      const data = response.data.data || response.data;

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.dispatchEvent(new Event('auth-change'));

      navigate('/restaurants');
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map(e => e.message).join(', '));
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'Arial' }}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '10px', fontSize: '16px' }} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', fontSize: '16px' }} />
        <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ padding: '10px', fontSize: '16px' }} />
        <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', fontSize: '16px' }} />
        
        <button type="submit" disabled={isLoading} style={{ padding: '10px', backgroundColor: isLoading ? '#ccc' : '#000', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <br/>
      <Link to="/login">Already have an account? Login here</Link>
    </div>
  );
};

export default Register;