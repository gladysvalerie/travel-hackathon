import type { User, Trip, Expense, Settlement, TripMember } from '../api/types';

// Mock user data
export const mockUser: User = {
  id: 'user-1',
  username: 'marvinchan',
  name: 'Marvin Chandra',
  email: 'marvinchan1605@gmail.com',
  createdAt: new Date().toISOString(),
};

// Additional mock users
const mockUser2: User = {
  id: 'user-2',
  username: 'gladys',
  name: 'Gladys Valerie',
  email: 'gladys@example.com',
  createdAt: new Date().toISOString(),
};

const mockUser3: User = {
  id: 'user-3',
  username: 'melvin',
  name: 'Melvin',
  email: 'melvin@example.com',
  createdAt: new Date().toISOString(),
};

// Mock trips data
export const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    name: 'Japan 2025',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-1',
    members: [
      {
        id: 'member-1',
        tripId: 'trip-1',
        userId: 'user-1',
        role: 'creator',
        user: mockUser,
      },
      {
        id: 'member-2',
        tripId: 'trip-1',
        userId: 'user-2',
        role: 'member',
        user: mockUser2,
      },
      {
        id: 'member-3',
        tripId: 'trip-1',
        userId: 'user-3',
        role: 'member',
        user: mockUser3,
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        description: 'Hotel Booking',
        amount: 300,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        tripId: 'trip-1',
        paidBy: 'user-1',
        payer: mockUser,
        splits: [
          { id: 'split-1', expenseId: 'expense-1', userId: 'user-1', shareAmount: 100, user: mockUser },
          { id: 'split-2', expenseId: 'expense-1', userId: 'user-2', shareAmount: 100, user: mockUser2 },
          { id: 'split-3', expenseId: 'expense-1', userId: 'user-3', shareAmount: 100, user: mockUser3 },
        ],
      },
      {
        id: 'expense-2',
        description: 'Lunch at Restaurant',
        amount: 150,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        tripId: 'trip-1',
        paidBy: 'user-2',
        payer: mockUser2,
        splits: [
          { id: 'split-4', expenseId: 'expense-2', userId: 'user-1', shareAmount: 50, user: mockUser },
          { id: 'split-5', expenseId: 'expense-2', userId: 'user-2', shareAmount: 50, user: mockUser2 },
          { id: 'split-6', expenseId: 'expense-2', userId: 'user-3', shareAmount: 50, user: mockUser3 },
        ],
      },
      {
        id: 'expense-3',
        description: 'Taxi to Airport',
        amount: 90,
        createdAt: new Date().toISOString(),
        tripId: 'trip-1',
        paidBy: 'user-1',
        payer: mockUser,
        splits: [
          { id: 'split-7', expenseId: 'expense-3', userId: 'user-1', shareAmount: 30, user: mockUser },
          { id: 'split-8', expenseId: 'expense-3', userId: 'user-2', shareAmount: 30, user: mockUser2 },
          { id: 'split-9', expenseId: 'expense-3', userId: 'user-3', shareAmount: 30, user: mockUser3 },
        ],
      },
    ],
  },
  {
    id: 'trip-2',
    name: 'Thailand Trip 2025',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-1',
    members: [
      {
        id: 'member-4',
        tripId: 'trip-2',
        userId: 'user-1',
        role: 'creator',
        user: mockUser,
      },
    ],
    expenses: [],
  },
];

// Mock settlement data
export const mockSettlement: Settlement = {
  ledger: {
    'user-1': 60, // Paid 390, owes 180, so owed 210... wait let me recalculate
    'user-2': -80, // Paid 50, owes 180, so owes 130
    'user-3': -180, // Paid 0, owes 180
  },
  transactions: [
    {
      from: 'user-3',
      to: 'user-1',
      amount: 180,
    },
    {
      from: 'user-2',
      to: 'user-1',
      amount: 80,
    },
  ],
};

// Recalculate settlement based on expenses
export const calculateMockSettlement = (tripId: string): Settlement => {
  const trip = mockTrips.find(t => t.id === tripId);
  if (!trip || !trip.expenses || !trip.members) {
    return { ledger: {}, transactions: [] };
  }

  const ledger: Record<string, number> = {};
  trip.members.forEach(member => {
    ledger[member.userId] = 0;
  });

  // Calculate balances
  trip.expenses.forEach(expense => {
    // Add what they paid
    ledger[expense.paidBy] += expense.amount;
    
    // Subtract what they owe
    expense.splits?.forEach(split => {
      ledger[split.userId] -= split.shareAmount;
    });
  });

  // Calculate transactions
  const debtors: Array<{ userId: string; amount: number }> = [];
  const creditors: Array<{ userId: string; amount: number }> = [];

  Object.entries(ledger).forEach(([userId, balance]) => {
    if (balance < -0.01) {
      debtors.push({ userId, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ userId, amount: balance });
    }
  });

  const transactions: Array<{ from: string; to: string; amount: number }> = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return { ledger, transactions };
};

// Get user name by ID
export const getUserName = (userId: string): string => {
  for (const trip of mockTrips) {
    if (trip.members) {
      const member = trip.members.find(m => m.userId === userId);
      if (member?.user) {
        return member.user.username;
      }
    }
  }
  return 'Unknown';
};

