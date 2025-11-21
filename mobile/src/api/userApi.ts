import apiClient from './apiClient';
import type { User } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockUserApi } from '../mock/mockApi';

export const userApi = {
  getCurrentUser: async (): Promise<User> => {
    if (USE_MOCK_DATA) {
      return mockUserApi.getCurrentUser();
    }
    const response = await apiClient.get<User>('/user/me');
    return response.data;
  },
};

