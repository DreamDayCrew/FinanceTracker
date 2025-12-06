import type { 
  Account, Category, Transaction, Budget, ScheduledPayment, 
  User, DashboardData, InsertAccount, InsertTransaction, 
  InsertBudget, InsertScheduledPayment 
} from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
console.log('API_BASE_URL', API_BASE_URL);
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

export const api = {
  getDashboard: () => apiRequest<DashboardData>('/api/dashboard'),
  
  getAccounts: () => apiRequest<Account[]>('/api/accounts'),
  createAccount: (data: InsertAccount) => 
    apiRequest<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: Partial<InsertAccount>) => 
    apiRequest<Account>(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccount: (id: number) => 
    apiRequest<void>(`/api/accounts/${id}`, { method: 'DELETE' }),
  
  getCategories: () => apiRequest<Category[]>('/api/categories'),
  
  getTransactions: () => apiRequest<Transaction[]>('/api/transactions'),
  createTransaction: (data: InsertTransaction) => 
    apiRequest<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => 
    apiRequest<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  
  getBudgets: (month: number, year: number) => 
    apiRequest<Budget[]>(`/api/budgets?month=${month}&year=${year}`),
  createBudget: (data: InsertBudget) => 
    apiRequest<Budget>('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudget: (id: number) => 
    apiRequest<void>(`/api/budgets/${id}`, { method: 'DELETE' }),
  
  getScheduledPayments: () => apiRequest<ScheduledPayment[]>('/api/scheduled-payments'),
  createScheduledPayment: (data: InsertScheduledPayment) => 
    apiRequest<ScheduledPayment>('/api/scheduled-payments', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduledPayment: (id: number, data: Partial<InsertScheduledPayment>) => 
    apiRequest<ScheduledPayment>(`/api/scheduled-payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteScheduledPayment: (id: number) => 
    apiRequest<void>(`/api/scheduled-payments/${id}`, { method: 'DELETE' }),
  
  getUser: () => apiRequest<User>('/api/user'),
  updateUser: (data: Partial<User>) => 
    apiRequest<User>('/api/user', { method: 'PATCH', body: JSON.stringify(data) }),
  setPin: (pin: string) => 
    apiRequest<{ success: boolean }>('/api/user/set-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  resetPin: () => 
    apiRequest<{ success: boolean }>('/api/user/reset-pin', { method: 'POST' }),
  
  suggestCategory: (description: string) => 
    apiRequest<{ categoryId: number | null }>('/api/transactions/suggest-category', { 
      method: 'POST', body: JSON.stringify({ description }) 
    }),

  parseSms: (message: string, sender?: string) => 
    apiRequest<{
      success: boolean;
      transaction?: Transaction;
      parsed?: {
        amount: number;
        type: 'debit' | 'credit';
        merchant?: string;
        description?: string;
        referenceNumber?: string;
        date?: string;
      };
      message?: string;
    }>('/api/parse-sms', { 
      method: 'POST', 
      body: JSON.stringify({ message, sender, receivedAt: new Date().toISOString() }) 
    }),
};

export { API_BASE_URL };
