import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { USE_MOCK_DATA, SKIP_AUTH } from '../config/useMockData';
import { mockUser } from '../mock/mockData';
import { errorLogger } from '../utils/errorLogger';
import type { User, LoginRequest, SignUpRequest } from '../api/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignUpRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      errorLogger.info('AuthContext initializing');
      if (USE_MOCK_DATA && SKIP_AUTH) {
        // Auto-login with mock user when using mock data AND skip auth is enabled
        errorLogger.info('Auto-logging in with mock user (authentication disabled)');
        setUser(mockUser);
        setToken('mock-token');
        setIsLoading(false);
        errorLogger.info('AuthContext initialized with mock user', {
          userId: mockUser.id,
          username: mockUser.username,
        });
      } else {
        loadStoredAuth();
      }
    } catch (error: any) {
      errorLogger.error('AuthContext initialization error', error, {
        component: 'AuthContext',
      });
      setIsLoading(false);
    }
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Login failed');
    }
  };

  const signup = async (data: SignUpRequest) => {
    try {
      const response = await authApi.signup(data);
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await userApi.getCurrentUser();
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

