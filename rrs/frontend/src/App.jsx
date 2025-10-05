import React, { useState, useEffect } from 'react';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import MainAppEnhanced from './components/MainAppEnhanced';
import { ThemeProvider } from './contexts/ThemeContext';

const API_BASE_URL = 'http://localhost:8000/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if token exists and fetch user data
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user:', err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg text-gray-900 dark:text-white">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {!user ? (
        <>
          {!showLogin ? (
            <RegisterPage onRegisterSuccess={() => setShowLogin(true)} />
          ) : (
            <LoginPage onLoginSuccess={(userData) => setUser(userData)} />
          )}
        </>
      ) : (
        <MainAppEnhanced user={user} setUser={setUser} />
      )}
    </ThemeProvider>
  );
};

export default App;
