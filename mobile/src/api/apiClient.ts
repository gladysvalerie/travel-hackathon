import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.4:5000'; // CHANGE

// Log the API base URL on startup
console.log('[API] Base URL:', BASE_URL);

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Only log for non-auth endpoints to reduce noise
        if (!config.url?.includes('/auth/')) {
          console.log('[API] Request to', config.url, '| Token attached');
        }
      } else {
        // Only log for non-auth endpoints
        if (!config.url?.includes('/auth/')) {
          console.log('[API] Request to', config.url, '| No token');
        }
      }
      
      // Don't set Content-Type for FormData - let axios/browser handle it
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (error) {
      console.error('[API ERROR] Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Log successful auth responses
    if (response.config.url?.includes('/auth/')) {
      console.log('[API] Auth response:', response.config.url, '| Status:', response.status);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log('[AUTH] 401 Unauthorized - clearing token and redirecting to login');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      // Navigation will be handled by AuthContext
    } else if (error.response) {
      // Log auth endpoint errors with details
      if (error.config?.url?.includes('/auth/')) {
        console.error('[AUTH ERROR]', error.config.url, '| Status:', error.response.status);
        console.error('[AUTH ERROR] Response:', error.response.data);
      } else {
        // Log other API errors
        console.error('[API ERROR]', error.config?.url, '| Status:', error.response.status, '|', error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('[API ERROR] Network error - no response from server');
      console.error('[API ERROR] URL:', error.config?.url);
      if (error.config?.url?.includes('/auth/')) {
        console.error('[AUTH ERROR] Check if backend is running and BASE_URL is correct:', BASE_URL);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

