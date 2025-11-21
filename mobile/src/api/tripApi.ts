import apiClient from './apiClient';
import type { Trip, CreateTripRequest } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockTripApi } from '../mock/mockApi';

export const tripApi = {
  getTrips: async (): Promise<Trip[]> => {
    if (USE_MOCK_DATA) {
      return mockTripApi.getTrips();
    }
    const response = await apiClient.get<Trip[]>('/trip');
    return response.data;
  },

  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    if (USE_MOCK_DATA) {
      return mockTripApi.createTrip(data);
    }
    const response = await apiClient.post<Trip>('/trip', data);
    return response.data;
  },

  getTripDetails: async (tripId: string): Promise<Trip> => {
    if (USE_MOCK_DATA) {
      return mockTripApi.getTripDetails(tripId);
    }
    const response = await apiClient.get<Trip>(`/trip/${tripId}`);
    return response.data;
  },

  updateTrip: async (tripId: string, data: CreateTripRequest): Promise<Trip> => {
    if (USE_MOCK_DATA) {
      return mockTripApi.updateTrip(tripId, data);
    }
    const response = await apiClient.put<Trip>(`/trip/${tripId}`, data);
    return response.data;
  },

  deleteTrip: async (tripId: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockTripApi.deleteTrip(tripId);
    }
    await apiClient.delete(`/trip/${tripId}`);
  },
};

