import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripApi } from '../api/tripApi';
import type { Trip, CreateTripRequest } from '../api/types';

export const useTrips = () => {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => tripApi.getTrips(),
  });
};

export const useTrip = (tripId: string) => {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripApi.getTripDetails(tripId),
    enabled: !!tripId,
  });
};

export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTripRequest) => tripApi.createTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

export const useUpdateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: string; data: CreateTripRequest }) =>
      tripApi.updateTrip(tripId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
    },
  });
};

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tripId: string) => tripApi.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

