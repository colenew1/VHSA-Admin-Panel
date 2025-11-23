import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Check for existing session on mount and handle magic link callback
  useEffect(() => {
    // Check if we're handling a magic link callback
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    
    if (accessToken) {
      // Handle magic link callback
      handleMagicLinkCallback(accessToken, urlParams);
    } else {
      // Normal auth check
      checkAuth();
    }
  }, []);

  const handleMagicLinkCallback = async (accessToken, urlParams) => {
    try {
      // Verify the session with backend
      const response = await axios.post(`${API_URL}/api/auth/verify-session`, {
        access_token: accessToken
      });
      
      const { session: sessionData, user: userData } = response.data;
      
      // Store in localStorage
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
      localStorage.setItem('auth_user', JSON.stringify(userData));
      
      setUser(userData);
      setSession(sessionData);
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error verifying magic link session:', error);
      // Clean up URL and show error
      window.history.replaceState({}, document.title, '/login');
      checkAuth();
    }
  };

  const checkAuth = async () => {
    try {
      const storedSession = localStorage.getItem('auth_session');
      const storedUser = localStorage.getItem('auth_user');
      
      if (storedSession && storedUser) {
        const sessionData = JSON.parse(storedSession);
        const userData = JSON.parse(storedUser);
        
        // Verify session is still valid
        try {
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${sessionData.access_token}`
            }
          });
          
          setUser(response.data.user);
          setSession(sessionData);
        } catch (error) {
          // Session expired or invalid
          console.log('Session expired, clearing auth');
          logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const requestMagicLink = async (email) => {
    try {
      const redirectTo = `${window.location.origin}/api/auth/callback`;
      const response = await axios.post(`${API_URL}/api/auth/request-magic-link`, {
        email,
        redirectTo
      });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send magic link'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_user');
    setUser(null);
    setSession(null);
  };

  const getAuthToken = () => {
    if (session) {
      return session.access_token;
    }
    const storedSession = localStorage.getItem('auth_session');
    if (storedSession) {
      return JSON.parse(storedSession).access_token;
    }
    return null;
  };

  const value = {
    user,
    session,
    loading,
    requestMagicLink,
    logout,
    checkAuth,
    getAuthToken,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
