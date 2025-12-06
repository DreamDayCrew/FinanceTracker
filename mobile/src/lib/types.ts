export interface Account {
  id: number;
  userId: number | null;
  name: string;
  type: 'bank' | 'credit_card';
  bankName: string | null;
  accountNumber: string | null;
  balance: string;
  creditLimit: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'income' | 'expense' | 'transfer';
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number | null;
  accountId: number | null;
  categoryId: number | null;
  amount: string;
  type: 'credit' | 'debit';
  description: string | null;
  merchant: string | null;
  referenceNumber: string | null;
  transactionDate: string;
  smsId: number | null;
  isRecurring: boolean;
  createdAt: string;
  account?: Account | null;
  category?: Category | null;
}

export interface Budget {
  id: number;
  userId: number | null;
  categoryId: number | null;
  amount: string;
  month: number;
  year: number;
  createdAt: string;
  category?: Category | null;
}

export interface ScheduledPayment {
  id: number;
  userId: number | null;
  name: string;
  amount: string;
  dueDate: number;
  categoryId: number | null;
  status: 'active' | 'inactive';
  notes: string | null;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
}

export interface User {
  id: number;
  name: string;
  pinHash: string | null;
  biometricEnabled: boolean;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalSpentToday: number;
  totalSpentMonth: number;
  monthlyExpensesByCategory: Array<{ categoryId: number; categoryName: string; total: number; color: string }>;
  budgetUsage: Array<{ categoryId: number; categoryName: string; spent: number; budget: number; percentage: number }>;
  nextScheduledPayment: ScheduledPayment | null;
  lastTransactions: Transaction[];
  upcomingBills: ScheduledPayment[];
}

export interface InsertAccount {
  name: string;
  type: 'bank' | 'credit_card';
  bankName?: string | null;
  accountNumber?: string | null;
  balance?: string;
  creditLimit?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
}

export interface InsertTransaction {
  type: 'credit' | 'debit';
  amount: string;
  description?: string | null;
  merchant?: string | null;
  categoryId?: number | null;
  accountId?: number | null;
  transactionDate?: string;
  referenceNumber?: string | null;
  isRecurring?: boolean;
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
  categoryId?: number | null;
  status?: 'active' | 'inactive';
  notes?: string | null;
}
