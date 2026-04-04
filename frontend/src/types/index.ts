export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  balance: number;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'CASH';
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  description: string | null;
  date: Date;
  isRecurring: boolean;
  createdAt: Date;
  account?: Account;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  spentAmount: number;
  isActive: boolean;
  percentUsed?: number;
  remaining?: number;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  description: string | null;
  isCompleted: boolean;
  percentComplete?: number;
  remaining?: number;
  daysLeft?: number | null;
}

export interface Insight {
  id: string;
  userId: string;
  type: 'warning' | 'tip' | 'prediction' | 'achievement';
  title: string;
  content: string;
  category: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface TransactionStats {
  income: number;
  expenses: number;
  balance: number;
  byCategory: Array<{ category: string; amount: number }>;
}

export interface BalanceInfo {
  total: number;
  accounts: number;
}