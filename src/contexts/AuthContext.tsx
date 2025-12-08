'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { enableNotificationsAuto } from '@/lib/utils/notifications';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  profile_picture_url: string | null;
  is_admin?: boolean;
  isAdmin?: boolean; // Alias for is_admin for convenience
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, inviteToken?: string) => Promise<{ groupId?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        // Safely get token from localStorage
        let token: string | null = null;
        try {
          token = localStorage.getItem('accessToken');
        } catch (error) {
          // localStorage might not be available (e.g., private browsing)
          console.warn('Unable to access localStorage:', error);
          setLoading(false);
          return;
        }

        if (token) {
          // Try to get user profile
          try {
            // Dynamic import to avoid issues in test environment
            const apiModule = await import('@/lib/api');
            if (apiModule.userApi && typeof apiModule.userApi.getProfile === 'function') {
              const userData = await apiModule.userApi.getProfile();
              setUser(userData);
              
              // Enable notifications automatically if user is already authenticated
              // Don't await to avoid blocking auth check
              enableNotificationsAuto().catch((error) => {
                // Silently fail - notifications are optional
              });
            }
          } catch (error) {
            // If profile fetch fails, clear tokens
            // Only log in non-test environments
            if (process.env.NODE_ENV !== 'test') {
              console.error('Failed to fetch user profile:', error);
            }
            // Safely clear tokens
            try {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            } catch (storageError) {
              // Ignore storage errors
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Safely clear tokens
        try {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        } catch (storageError) {
          // Ignore storage errors
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, password });
      
      // Safely store tokens
      try {
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
      } catch (storageError) {
        // If storage fails, still set user but warn
        console.warn('Failed to store tokens in localStorage:', storageError);
        throw new Error('Unable to save login session. Please check your browser settings.');
      }
      
      setUser(response.user);
      
      // Enable notifications automatically after successful login
      // Don't await to avoid blocking login flow
      enableNotificationsAuto().catch((error) => {
        // Silently fail - notifications are optional
        if (process.env.NODE_ENV !== 'test') {
          console.log('Failed to enable notifications automatically:', error);
        }
      });
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (username: string, password: string, inviteToken?: string) => {
    try {
      const response = await authApi.signup({ username, password, inviteToken });
      
      // Safely store tokens
      try {
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);
      } catch (storageError) {
        // If storage fails, still set user but warn
        console.warn('Failed to store tokens in localStorage:', storageError);
        throw new Error('Unable to save login session. Please check your browser settings.');
      }
      
      setUser(response.user);
      
      // Enable notifications automatically after successful signup
      // Don't await to avoid blocking signup flow
      enableNotificationsAuto().catch((error) => {
        // Silently fail - notifications are optional
        if (process.env.NODE_ENV !== 'test') {
          console.log('Failed to enable notifications automatically:', error);
        }
      });
      
      return { groupId: response.groupId };
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = () => {
    // Safely clear tokens
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      // Ignore storage errors - still log out user
      console.warn('Failed to clear tokens from localStorage:', error);
    }
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const apiModule = await import('@/lib/api');
      if (apiModule.userApi && typeof apiModule.userApi.getProfile === 'function') {
        const userData = await apiModule.userApi.getProfile();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

