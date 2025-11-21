import apiClient from './apiClient';
import type { LoginRequest, LoginResponse, SignUpRequest, SignUpResponse } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockAuthApi } from '../mock/mockApi';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    if (USE_MOCK_DATA) {
      return mockAuthApi.login(data);
    }
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  signup: async (data: SignUpRequest): Promise<SignUpResponse> => {
    if (USE_MOCK_DATA) {
      return mockAuthApi.signup(data);
    }
    const response = await apiClient.post<SignUpResponse>('/auth/register', data);
    return response.data;
  },
};

