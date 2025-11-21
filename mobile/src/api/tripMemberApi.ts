import apiClient from './apiClient';
import type { TripMember, AddMemberRequest } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockTripMemberApi } from '../mock/mockApi';

export const tripMemberApi = {
  addMember: async (tripId: string, data: AddMemberRequest): Promise<TripMember> => {
    if (USE_MOCK_DATA) {
      return mockTripMemberApi.addMember(tripId, data);
    }
    const response = await apiClient.post<TripMember>(`/tripmember/${tripId}/members`, data);
    return response.data;
  },
};

