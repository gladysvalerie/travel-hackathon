import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '../api/expenseApi';

export const useExpense = (expenseId: string) => {
  return useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expenseApi.getExpense(expenseId),
    enabled: !!expenseId,
  });
};

