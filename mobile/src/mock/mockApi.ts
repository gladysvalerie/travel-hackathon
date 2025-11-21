import type { User, Trip, Expense, Settlement, CreateTripRequest, CreateExpenseRequest, SignUpRequest, LoginRequest } from '../api/types';
import { mockUser, mockTrips, calculateMockSettlement, getUserName } from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAuthApi = {
  login: async (data: LoginRequest) => {
    await delay(800);
    console.log('[MOCK API] Login', data);
    return {
      user: mockUser,
      token: 'mock-jwt-token-' + Date.now(),
    };
  },

  signup: async (data: SignUpRequest) => {
    await delay(1000);
    console.log('[MOCK API] Signup', data);
    const newUser: User = {
      id: 'user-' + Date.now(),
      username: data.username,
      name: data.name,
      email: data.email,
      createdAt: new Date().toISOString(),
    };
    return {
      user: newUser,
      token: 'mock-jwt-token-' + Date.now(),
    };
  },
};

export const mockTripApi = {
  getTrips: async (): Promise<Trip[]> => {
    await delay(500);
    console.log('[MOCK API] Get trips');
    return mockTrips;
  },

  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    await delay(800);
    console.log('[MOCK API] Create trip', data);
    const newTrip: Trip = {
      id: 'trip-' + Date.now(),
      name: data.name,
      createdAt: new Date().toISOString(),
      createdBy: mockUser.id,
      creator: mockUser,
      members: [
        {
          id: 'member-' + Date.now(),
          tripId: 'trip-' + Date.now(),
          userId: mockUser.id,
          role: 'creator',
          user: mockUser,
        },
      ],
      expenses: [],
    };
    mockTrips.unshift(newTrip);
    return newTrip;
  },

  getTripDetails: async (tripId: string): Promise<Trip> => {
    await delay(400);
    console.log('[MOCK API] Get trip details', tripId);
    const trip = mockTrips.find(t => t.id === tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }
    return trip;
  },

  updateTrip: async (tripId: string, data: CreateTripRequest): Promise<Trip> => {
    await delay(600);
    console.log('[MOCK API] Update trip', tripId, data);
    const trip = mockTrips.find(t => t.id === tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }
    trip.name = data.name;
    return trip;
  },

  deleteTrip: async (tripId: string): Promise<void> => {
    await delay(500);
    console.log('[MOCK API] Delete trip', tripId);
    const index = mockTrips.findIndex(t => t.id === tripId);
    if (index > -1) {
      mockTrips.splice(index, 1);
    }
  },
};

export const mockExpenseApi = {
  getTripExpenses: async (tripId: string): Promise<Expense[]> => {
    await delay(400);
    console.log('[MOCK API] Get trip expenses', tripId);
    const trip = mockTrips.find(t => t.id === tripId);
    return trip?.expenses || [];
  },

  createExpense: async (tripId: string, data: CreateExpenseRequest): Promise<Expense> => {
    await delay(800);
    console.log('[MOCK API] Create expense', tripId, data);
    const trip = mockTrips.find(t => t.id === tripId);
    if (!trip || !trip.members) {
      throw new Error('Trip not found');
    }

    // Calculate splits based on type
    let splits: Array<{ userId: string; shareAmount: number; user: User }> = [];
    
    if (data.type === 'equal') {
      const share = data.amount / trip.members.length;
      splits = trip.members.map(m => ({
        userId: m.userId,
        shareAmount: share,
        user: m.user!,
      }));
    } else if (data.type === 'equal_selected' && data.members) {
      const selectedMembers = trip.members.filter(m => 
        data.members!.includes(m.user?.username || '')
      );
      const share = data.amount / selectedMembers.length;
      splits = selectedMembers.map(m => ({
        userId: m.userId,
        shareAmount: share,
        user: m.user!,
      }));
    } else if (data.type === 'custom' && data.splits) {
      splits = data.splits.map(s => {
        const member = trip.members.find(m => m.user?.username === s.username);
        return {
          userId: member?.userId || '',
          shareAmount: s.shareAmount,
          user: member?.user || mockUser,
        };
      });
    }

    // Find payer - use first member if not specified
    const payer = trip.members.find(m => m.userId === mockUser.id) || trip.members[0];
    
    const expenseId = 'expense-' + Date.now();
    const newExpense: Expense = {
      id: expenseId,
      description: data.description,
      amount: data.amount,
      createdAt: new Date().toISOString(),
      tripId,
      paidBy: payer?.userId || mockUser.id,
      payer: payer?.user || mockUser,
      splits: splits.map((s, i) => ({
        id: 'split-' + Date.now() + '-' + i,
        expenseId: expenseId,
        userId: s.userId,
        shareAmount: s.shareAmount,
        user: s.user,
      })),
    };

    if (!trip.expenses) {
      trip.expenses = [];
    }
    trip.expenses.unshift(newExpense);
    return newExpense;
  },

  getExpense: async (expenseId: string): Promise<Expense> => {
    await delay(300);
    console.log('[MOCK API] Get expense', expenseId);
    for (const trip of mockTrips) {
      const expense = trip.expenses?.find(e => e.id === expenseId);
      if (expense) return expense;
    }
    throw new Error('Expense not found');
  },

  updateExpense: async (expenseId: string, data: { description: string; amount: number }): Promise<Expense> => {
    await delay(600);
    console.log('[MOCK API] Update expense', expenseId, data);
    for (const trip of mockTrips) {
      const expense = trip.expenses?.find(e => e.id === expenseId);
      if (expense) {
        expense.description = data.description;
        expense.amount = data.amount;
        // Recalculate splits as equal
        if (trip.members) {
          const share = data.amount / trip.members.length;
          expense.splits = trip.members.map((m, i) => ({
            id: 'split-' + Date.now() + '-' + i,
            expenseId: expense.id,
            userId: m.userId,
            shareAmount: share,
            user: m.user!,
          }));
        }
        return expense;
      }
    }
    throw new Error('Expense not found');
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    await delay(400);
    console.log('[MOCK API] Delete expense', expenseId);
    for (const trip of mockTrips) {
      if (trip.expenses) {
        const index = trip.expenses.findIndex(e => e.id === expenseId);
        if (index > -1) {
          trip.expenses.splice(index, 1);
          return;
        }
      }
    }
  },
};

export const mockSettlementApi = {
  getSettlement: async (tripId: string): Promise<Settlement> => {
    await delay(400);
    console.log('[MOCK API] Get settlement', tripId);
    return calculateMockSettlement(tripId);
  },
};

export const mockTripMemberApi = {
  addMember: async (tripId: string, data: { username: string }) => {
    await delay(600);
    console.log('[MOCK API] Add member', tripId, data);
    const trip = mockTrips.find(t => t.id === tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const newMember: TripMember = {
      id: 'member-' + Date.now(),
      tripId,
      userId: 'user-' + Date.now(),
      role: 'member',
      user: {
        id: 'user-' + Date.now(),
        username: data.username,
        name: data.username,
        email: `${data.username}@example.com`,
        createdAt: new Date().toISOString(),
      },
    };

    if (!trip.members) {
      trip.members = [];
    }
    trip.members.push(newMember);
    return newMember;
  },
};

export const mockUserApi = {
  getCurrentUser: async (): Promise<User> => {
    await delay(300);
    console.log('[MOCK API] Get current user');
    return mockUser;
  },
};

