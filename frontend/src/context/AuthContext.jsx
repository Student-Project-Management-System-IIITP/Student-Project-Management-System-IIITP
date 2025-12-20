import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { handleApiError } from '../utils/errorHandler';
import { getToken, setToken, removeToken } from '../utils/tokenStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);


  // Check for existing session on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getToken();
        if (token) {
          const data = await authAPI.getProfile();
          if (data.success) {
            setUser(data.data.user);
            setRoleData(data.data.roleData);
            setUserRole(data.data.user.role);
          } else {
            removeToken();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      setIsLoading(true);
      
      // Use base API; surface specific errors back to caller
      const data = await authAPI.login({ email, password });
      
      if (data.success) {
        const token = data.data.token;
        setToken(token, rememberMe);
        setUser(data.data.user);
        setRoleData(data.data.roleData);
        setUserRole(data.data.user.role);
        
        return { success: true, user: data.data.user };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      // If the enhanced API already showed a toast, we still need to return an error
      // for the component to handle (like not redirecting)
      const errorMessage = handleApiError(error, false);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setIsLoading(true);
      
      // Use base API; return server message so UI can show precise toast
      const data = await authAPI.registerStudent(userData);
      
      if (data.success) {
        // Signup successful - don't auto-login, just return success
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      // If the enhanced API already showed a toast, we still need to return an error
      // for the component to handle (like not redirecting)
      const errorMessage = handleApiError(error, false);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API if user is authenticated
      if (user) {
        await authAPI.logout();
      }
    } catch (error) {
      // Even if logout API fails, we should still clear local state
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state from both storages
      removeToken();
      setUser(null);
      setRoleData(null);
      setUserRole(null);
      // Show logout success toast
      const { showSuccess } = await import('../utils/toast');
      showSuccess('Logged out successfully!');
      // Navigation will be handled by the component calling logout
    }
  };

  const refreshUserData = async () => {
    try {
      const token = getToken();
      if (token) {
        const data = await authAPI.getProfile();
        if (data.success) {
          setUser(data.data.user);
          setRoleData(data.data.roleData);
          setUserRole(data.data.user.role);
          return { success: true };
        }
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return { success: false };
    }
  };

  const value = {
    user,
    roleData,
    userRole,
    isLoading,
    login,
    signup,
    logout,
    refreshUserData,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
