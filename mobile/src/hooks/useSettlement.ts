import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementApi, type SettleTransactionRequest } from '../api/settlementApi';

export const useSettlement = (tripId: string) => {
  return useQuery({
    queryKey: ['settlement', tripId],
    queryFn: () => settlementApi.getSettlement(tripId),
    enabled: !!tripId,
  });
};

export const useSettleTransaction = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettleTransactionRequest) =>
      settlementApi.settleTransaction(tripId, data),
    onSuccess: () => {
      // Invalidate and refetch settlement data
      queryClient.invalidateQueries({ queryKey: ['settlement', tripId] });
      // Also invalidate trip data to refresh balances
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

