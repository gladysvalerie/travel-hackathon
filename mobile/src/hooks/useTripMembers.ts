import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripMemberApi } from '../api/tripMemberApi';

export const useAddMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tripId, username }: { tripId: string; username: string }) =>
      tripMemberApi.addMember(tripId, { username }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

