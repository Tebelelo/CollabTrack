// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Assuming this is your axios instance

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true);

    try {
      // Ensure your backend login endpoint is correct, e.g., '/api/auth/login'
      const response = await api.post('/auth/login', { email, password });
      
      // Assuming your backend returns a token and user info on successful login
      const { token, user, role } = response.data;

      // Store token and user info (e.g., in localStorage or context)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', role); // Store user role

      // Redirect based on role or to a default dashboard
      if (role === 'admin') {
        navigate('/dashboard');
      } else if (role === 'project_manager') {
        navigate('/managerDashboard');
      } else if (role === 'team_member') {
        navigate('/teamDashboard');
      } else {
        navigate('/projects'); // Default redirect
      }

    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx (e.g., 401, 400, 500)
        if (err.response.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else if (err.response.data && err.response.data.message) {
          // Use a specific message from the backend if available
          setError(`Login failed: ${err.response.data.message}`);
        } else {
          setError(`Login failed with status ${err.response.status}. Please try again.`);
        }
      } else if (err.request) {
        // The request was made but no response was received.
        // This is often a network error, server being down, or a CORS issue preventing the response.
        setError('Could not connect to the server. Please check your internet connection or try again later. If the issue persists, the server might be temporarily unavailable.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('An unexpected error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleSubmit}>
          {/* ... (your existing email and password input fields) ... */}
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          {/* ... (your existing submit button) ... */}
        </form>
      </div>
    </div>
  );
};

export default Login;