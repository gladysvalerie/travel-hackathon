import apiClient from './apiClient';
import type { Settlement } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockSettlementApi } from '../mock/mockApi';

export const settlementApi = {
  getSettlement: async (tripId: string): Promise<Settlement> => {
    if (USE_MOCK_DATA) {
      return mockSettlementApi.getSettlement(tripId);
    }
    const response = await apiClient.get<Settlement>(`/settlement/${tripId}`);
    return response.data;
  },
};

