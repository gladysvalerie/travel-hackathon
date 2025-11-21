// TypeScript types matching backend Prisma schema

export interface User {
  id: string;
  username: string;
  name: string | null;
  email: string;
  passwordHash?: string; // Only in backend, not in API responses
  createdAt: string;
  tripsCreated?: Trip[];
  tripMembers?: TripMember[];
  expensesPaid?: Expense[];
  expenseSplits?: ExpenseSplit[];
}

export interface Trip {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  creator?: User;
  members?: TripMember[];
  expenses?: Expense[];
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  role: string;
  trip?: Trip;
  user?: User;
}

export interface Expense {
  id: string;
  description: string | null;
  amount: number;
  createdAt: string;
  tripId: string;
  paidBy: string;
  trip?: Trip;
  payer?: User;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  shareAmount: number;
  expense?: Expense;
  user?: User;
}

export interface Settlement {
  ledger: Record<string, number>; // userId -> balance
  transactions: SettlementTransaction[];
}

export interface SettlementTransaction {
  from: string; // userId
  to: string; // userId
  amount: number;
}

// API Request/Response types

export interface LoginRequest {
  identifier: string; // username or email
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface SignUpRequest {
  username: string;
  name: string;
  email: string;
  password: string;
}

export interface SignUpResponse {
  user: User;
  token: string;
}

export interface CreateTripRequest {
  name: string;
}

export interface AddMemberRequest {
  username: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  type: "equal" | "equal_selected" | "custom";
  members?: string[]; // for equal_selected
  splits?: Array<{ username: string; shareAmount: number }>; // for custom
}

export interface UpdateExpenseRequest {
  description: string;
  amount: number;
}

export interface ParsedReceiptData {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  total: number | null;
  items: Array<{
    name: string;
    qty?: number;
    pricePerUnit?: number;
    lineTotal?: number;
  }>;
}

