import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../api/expenseApi';
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from '../api/types';

export const useTripExpenses = (tripId: string) => {
  return useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => expenseApi.getTripExpenses(tripId),
    enabled: !!tripId,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: string; data: CreateExpenseRequest }) =>
      expenseApi.createExpense(tripId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: UpdateExpenseRequest }) =>
      expenseApi.updateExpense(expenseId, data),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', expense.tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', expense.tripId] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ expenseId, tripId }: { expenseId: string; tripId: string }) =>
      expenseApi.deleteExpense(expenseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', variables.tripId] });
    },
  });
};

