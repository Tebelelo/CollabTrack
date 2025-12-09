// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { supabase } from '../supabaseClient';

// It's good practice to centralize route paths to avoid "magic strings"
const ROLES_DASHBOARDS = {
  admin: '/dashboard',
  project_manager: '/managerDashboard',
  team_member: '/teamDashboard',
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const data = await authAPI.login(form);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // This can be moved to the backend to simplify the client's responsibility.
      // The backend can handle the Supabase sign-in after validating the user.
      const { error: supabaseError } = await supabase.auth.signInWithPassword(form);
      if (supabaseError) {
        console.warn('Supabase login failed during backend login:', supabaseError);
      }
      
      console.log('Login successful, user role:', data.user.role);
      
      // Use the constants object for cleaner, more maintainable navigation
      const dashboardPath = ROLES_DASHBOARDS[data.user.role] || ROLES_DASHBOARDS.admin;
      navigate(dashboardPath);

    } catch (err) {
      // Better error message handling for API responses
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email" // Use type="email" for better mobile keyboard and basic validation
            name="email" // `name` attribute is crucial for the generic handleChange
            id="email" // Add id for accessibility
            value={form.email}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password" // Use type="password" to mask input
            name="password" // `name` attribute is crucial for the generic handleChange
            id="password" // Add id for accessibility
            value={form.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50" // Tailwind classes are fine
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-blue-600 hover:text-blue-500">
          Register here
        </Link>
      </p>
    </div>
  );
}