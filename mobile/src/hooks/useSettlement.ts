import { useQuery } from '@tanstack/react-query';
import { settlementApi } from '../api/settlementApi';

export const useSettlement = (tripId: string) => {
  return useQuery({
    queryKey: ['settlement', tripId],
    queryFn: () => settlementApi.getSettlement(tripId),
    enabled: !!tripId,
  });
};

