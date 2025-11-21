import apiClient from './apiClient';
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from './types';
import { USE_MOCK_DATA } from '../config/useMockData';
import { mockExpenseApi } from '../mock/mockApi';

export const expenseApi = {
  getTripExpenses: async (tripId: string): Promise<Expense[]> => {
    if (USE_MOCK_DATA) {
      return mockExpenseApi.getTripExpenses(tripId);
    }
    const response = await apiClient.get<Expense[]>(`/expense/${tripId}`);
    return response.data;
  },

  createExpense: async (tripId: string, data: CreateExpenseRequest): Promise<Expense> => {
    if (USE_MOCK_DATA) {
      return mockExpenseApi.createExpense(tripId, data);
    }
    const response = await apiClient.post<Expense>(`/expense/${tripId}`, data);
    return response.data;
  },

  getExpense: async (expenseId: string): Promise<Expense> => {
    if (USE_MOCK_DATA) {
      return mockExpenseApi.getExpense(expenseId);
    }
    const response = await apiClient.get<Expense>(`/expense/detail/${expenseId}`);
    return response.data;
  },

  updateExpense: async (expenseId: string, data: UpdateExpenseRequest): Promise<Expense> => {
    if (USE_MOCK_DATA) {
      return mockExpenseApi.updateExpense(expenseId, data);
    }
    const response = await apiClient.put<Expense>(`/expense/detail/${expenseId}`, data);
    return response.data;
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockExpenseApi.deleteExpense(expenseId);
    }
    await apiClient.delete(`/expense/detail/${expenseId}`);
  },
};

