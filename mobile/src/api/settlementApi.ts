import apiClient from './apiClient';
import type { Settlement } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockSettlementApi } from '../mock/mockApi';

export interface SettleTransactionRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface SettledTransaction {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settledAt: string;
  settledBy: string;
  fromUser?: { username: string };
  toUser?: { username: string };
}

export const settlementApi = {
  getSettlement: async (tripId: string): Promise<Settlement> => {
    if (USE_MOCK_DATA) {
      return mockSettlementApi.getSettlement(tripId);
    }
    const response = await apiClient.get<Settlement>(`/settlement/${tripId}`);
    return response.data;
  },

  settleTransaction: async (
    tripId: string,
    data: SettleTransactionRequest
  ): Promise<SettledTransaction> => {
    if (USE_MOCK_DATA) {
      throw new Error('Settle transaction not implemented in mock data');
    }
    const response = await apiClient.post<SettledTransaction>(
      `/settlement/${tripId}/settle`,
      data
    );
    return response.data;
  },
};

