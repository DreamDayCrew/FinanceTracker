export interface Account {
  id: number;
  userId: number;
  name: string;
  type: 'bank_account' | 'credit_card';
  balance: string;
  creditLimit: string | null;
  accountNumber: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  userId: number | null;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  accountId: number | null;
  categoryId: number | null;
  type: 'credit' | 'debit';
  amount: string;
  merchant: string | null;
  description: string | null;
  transactionDate: string;
  smsHash: string | null;
  createdAt: string;
  account?: Account;
  category?: Category;
}

export interface Budget {
  id: number;
  userId: number;
  categoryId: number;
  amount: string;
  month: number;
  year: number;
  createdAt: string;
  category?: Category;
}

export interface ScheduledPayment {
  id: number;
  userId: number;
  categoryId: number | null;
  name: string;
  amount: string;
  dueDate: number;
  notes: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  category?: Category;
}

export interface User {
  id: number;
  email: string | null;
  pinHash: string | null;
  biometricEnabled: boolean;
  theme: string;
  createdAt: string;
}

export interface DashboardData {
  totalSpentToday: number;
  totalSpentMonth: number;
  monthlySpendingByCategory: Array<{ categoryId: number; name: string; total: number; color: string }>;
  budgetUsage: Array<{ categoryId: number; name: string; spent: number; budget: number; percentage: number }>;
  upcomingPayment: ScheduledPayment | null;
  recentTransactions: Transaction[];
}

export interface InsertAccount {
  name: string;
  type: 'bank_account' | 'credit_card';
  balance: string;
  creditLimit: string | null;
  accountNumber: string | null;
}

export interface InsertTransaction {
  type: 'credit' | 'debit';
  amount: string;
  merchant: string | null;
  description: string | null;
  categoryId: number | null;
  accountId: number | null;
  transactionDate: string;
  smsHash: string | null;
}

export interface InsertBudget {
  categoryId: number;
  amount: string;
  month: number;
  year: number;
}

export interface InsertScheduledPayment {
  name: string;
  amount: string;
  dueDate: number;
  notes: string | null;
  categoryId: number | null;
  status: 'active' | 'inactive';
}
