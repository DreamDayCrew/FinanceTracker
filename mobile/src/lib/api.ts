import type { 
  Account, Category, Transaction, Budget, ScheduledPayment, 
  User, DashboardData, InsertAccount, InsertTransaction, 
  InsertBudget, InsertScheduledPayment, PaymentOccurrence,
  SavingsGoal, SavingsContribution, InsertSavingsGoal, InsertSavingsContribution,
  SalaryProfile, SalaryCycle, InsertSalaryProfile,
  Loan, LoanInstallment, InsertLoan,
  CardDetails, InsertCardDetails,
  LoanTerm, LoanPayment, InsertLoanTerm, InsertLoanPayment, LoanWithDetails
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
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      // Create an error object with additional properties
      const error: any = new Error(errorData.message || errorData.error || `API error ${response.status}`);
      // Attach additional error data
      if (errorData.isSavingsContribution) {
        error.isSavingsContribution = true;
        error.savingsGoalName = errorData.savingsGoalName;
        error.savingsContributionId = errorData.savingsContributionId;
      }
      throw error;
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T;
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
  updateTransaction: (id: number, data: Partial<InsertTransaction>) => 
    apiRequest<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => 
    apiRequest<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  
  getBudgets: (month: number, year: number) => 
    apiRequest<Budget[]>(`/api/budgets?month=${month}&year=${year}`),
  createBudget: (data: InsertBudget) => 
    apiRequest<Budget>('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id: number, data: Partial<InsertBudget>) => 
    apiRequest<Budget>(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBudget: (id: number) => 
    apiRequest<void>(`/api/budgets/${id}`, { method: 'DELETE' }),
  
  getScheduledPayments: () => apiRequest<ScheduledPayment[]>('/api/scheduled-payments'),
  createScheduledPayment: (data: InsertScheduledPayment) => 
    apiRequest<ScheduledPayment>('/api/scheduled-payments', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduledPayment: (id: number, data: Partial<InsertScheduledPayment>) => 
    apiRequest<ScheduledPayment>(`/api/scheduled-payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteScheduledPayment: (id: number) => 
    apiRequest<void>(`/api/scheduled-payments/${id}`, { method: 'DELETE' }),
  
  getPaymentOccurrences: (month: number, year: number) => 
    apiRequest<any[]>(`/api/payment-occurrences?month=${month}&year=${year}`),
  generatePaymentOccurrences: (month: number, year: number) => 
    apiRequest<any>('/api/payment-occurrences/generate', { 
      method: 'POST', 
      body: JSON.stringify({ month, year }) 
    }),
  updatePaymentOccurrence: (id: number, data: { 
    status?: string; 
    affectTransaction?: boolean; 
    affectAccountBalance?: boolean;
  }) => 
    apiRequest<any>(`/api/payment-occurrences/${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }),
  
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

  getSavingsGoals: () => apiRequest<SavingsGoal[]>('/api/savings-goals'),
  createSavingsGoal: (data: InsertSavingsGoal) => 
    apiRequest<SavingsGoal>('/api/savings-goals', { method: 'POST', body: JSON.stringify(data) }),
  updateSavingsGoal: (id: number, data: Partial<InsertSavingsGoal>) => 
    apiRequest<SavingsGoal>(`/api/savings-goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSavingsGoal: (id: number) => 
    apiRequest<void>(`/api/savings-goals/${id}`, { method: 'DELETE' }),
  getContributions: (goalId: number) => 
    apiRequest<SavingsContribution[]>(`/api/savings-goals/${goalId}/contributions`),
  addContribution: (goalId: number, data: Omit<InsertSavingsContribution, 'savingsGoalId'>) => 
    apiRequest<SavingsContribution>(`/api/savings-goals/${goalId}/contributions`, { 
      method: 'POST', body: JSON.stringify(data) 
    }),
  deleteContribution: (id: number) => 
    apiRequest<void>(`/api/savings-contributions/${id}`, { method: 'DELETE' }),

  getSalaryProfiles: () => apiRequest<SalaryProfile[]>('/api/salary-profiles'),
  createSalaryProfile: (data: InsertSalaryProfile) => 
    apiRequest<SalaryProfile>('/api/salary-profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateSalaryProfile: (id: number, data: Partial<InsertSalaryProfile>) => 
    apiRequest<SalaryProfile>(`/api/salary-profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSalaryProfile: (id: number) => 
    apiRequest<void>(`/api/salary-profiles/${id}`, { method: 'DELETE' }),
  getSalaryCycles: (profileId: number) => 
    apiRequest<SalaryCycle[]>(`/api/salary-profiles/${profileId}/cycles`),
  getNextPaydays: (profileId: number, count?: number) => 
    apiRequest<string[]>(`/api/salary-profiles/${profileId}/next-paydays${count ? `?count=${count}` : ''}`),

  getLoans: () => apiRequest<Loan[]>('/api/loans'),
  getLoan: (id: number) => apiRequest<Loan>(`/api/loans/${id}`),
  createLoan: (data: InsertLoan) => 
    apiRequest<Loan>('/api/loans', { method: 'POST', body: JSON.stringify(data) }),
  updateLoan: (id: number, data: Partial<InsertLoan>) => 
    apiRequest<Loan>(`/api/loans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLoan: (id: number) => 
    apiRequest<void>(`/api/loans/${id}`, { method: 'DELETE' }),
  getLoanInstallments: (loanId: number) => 
    apiRequest<LoanInstallment[]>(`/api/loans/${loanId}/installments`),
  updateInstallment: (loanId: number, installmentId: number, data: Partial<LoanInstallment>) => 
    apiRequest<LoanInstallment>(`/api/loans/${loanId}/installments/${installmentId}`, { 
      method: 'PATCH', body: JSON.stringify(data) 
    }),
  generateInstallments: (loanId: number) => 
    apiRequest<LoanInstallment[]>(`/api/loans/${loanId}/generate-installments`, { method: 'POST' }),

  getCardDetails: (accountId: number) => 
    apiRequest<CardDetails | null>(`/api/accounts/${accountId}/card-details`),
  saveCardDetails: (accountId: number, data: Omit<InsertCardDetails, 'accountId'>) => 
    apiRequest<CardDetails>(`/api/accounts/${accountId}/card-details`, { 
      method: 'POST', body: JSON.stringify(data) 
    }),
  deleteCardDetails: (accountId: number) => 
    apiRequest<void>(`/api/accounts/${accountId}/card-details`, { method: 'DELETE' }),

  getLoanWithDetails: (id: number) => apiRequest<LoanWithDetails>(`/api/loans/${id}/details`),
  getLoanTerms: (loanId: number) => apiRequest<LoanTerm[]>(`/api/loans/${loanId}/terms`),
  createLoanTerm: (loanId: number, data: Omit<InsertLoanTerm, 'loanId'>) => 
    apiRequest<LoanTerm>(`/api/loans/${loanId}/terms`, { method: 'POST', body: JSON.stringify(data) }),
  getLoanPayments: (loanId: number) => apiRequest<LoanPayment[]>(`/api/loans/${loanId}/payments`),
  createLoanPayment: (loanId: number, data: Omit<InsertLoanPayment, 'loanId'>) => 
    apiRequest<LoanPayment>(`/api/loans/${loanId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  markInstallmentPaid: (loanId: number, installmentId: number, data: { 
    paidDate: string; 
    paidAmount: string; 
    accountId?: number;
    notes?: string;
  }) => 
    apiRequest<LoanInstallment>(`/api/loans/${loanId}/installments/${installmentId}/pay`, { 
      method: 'POST', body: JSON.stringify(data) 
    }),

  verifyPin: (pin: string) => 
    apiRequest<{ valid: boolean; message?: string }>('/api/user/verify-pin', { 
      method: 'POST', body: JSON.stringify({ pin }) 
    }),

  getMonthlyExpenses: () => 
    apiRequest<Array<{
      month: string;
      year: number;
      fullMonth: string;
      expenses: number;
      monthIndex: number;
    }>>('/api/expenses/monthly'),

  getCategoryBreakdown: (month: number, year: number) => 
    apiRequest<{
      month: number;
      year: number;
      totalExpenses: number;
      breakdown: Array<{
        categoryId: number;
        categoryName: string;
        total: number;
        color: string;
        transactionCount: number;
      }>;
    }>(`/api/expenses/category-breakdown?month=${month}&year=${year}`),

  getCreditCardSpending: () =>
    apiRequest<Array<{
      accountId: number;
      accountName: string;
      color: string | null;
      billingDate: number;
      cycleStart: string;
      cycleEnd: string;
      totalSpent: number;
      creditLimit: number;
      availableCredit: number;
      usedCredit: number;
      utilizationPercent: number;
    }>>('/api/credit-card-spending'),
};

export { API_BASE_URL };
