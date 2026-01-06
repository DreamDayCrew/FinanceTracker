import { 
  users, accounts, categories, transactions, budgets, scheduledPayments, smsLogs,
  paymentOccurrences, savingsGoals, savingsContributions, salaryProfiles, salaryCycles,
  loans, loanComponents, loanInstallments, loanTerms, loanPayments, cardDetails,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction, type TransactionWithRelations,
  type Budget, type InsertBudget,
  type ScheduledPayment, type InsertScheduledPayment,
  type PaymentOccurrence, type InsertPaymentOccurrence,
  type SavingsGoal, type InsertSavingsGoal,
  type SavingsContribution, type InsertSavingsContribution,
  type SalaryProfile, type InsertSalaryProfile,
  type SalaryCycle, type InsertSalaryCycle,
  type Loan, type InsertLoan, type LoanWithRelations,
  type LoanComponent, type InsertLoanComponent,
  type LoanInstallment, type InsertLoanInstallment,
  type LoanTerm, type InsertLoanTerm,
  type LoanPayment, type InsertLoanPayment,
  type CardDetails, type InsertCardDetails,
  type SmsLog, type InsertSmsLog,
  type DashboardStats,
  DEFAULT_CATEGORIES
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Accounts
  getAllAccounts(userId?: number): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  getDefaultAccount(): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  updateAccountBalance(id: number, amount: string, type: 'add' | 'subtract'): Promise<Account | undefined>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  seedDefaultCategories(): Promise<void>;

  // Transactions
  getAllTransactions(filters?: {
    userId?: number;
    accountId?: number;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
  }): Promise<TransactionWithRelations[]>;
  getTransaction(id: number): Promise<TransactionWithRelations | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<boolean>;

  // Budgets
  getAllBudgets(filters?: { userId?: number; month?: number; year?: number }): Promise<Budget[]>;
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;

  // Scheduled Payments
  getAllScheduledPayments(userId?: number): Promise<ScheduledPayment[]>;
  getScheduledPayment(id: number): Promise<ScheduledPayment | undefined>;
  createScheduledPayment(payment: InsertScheduledPayment): Promise<ScheduledPayment>;
  updateScheduledPayment(id: number, payment: Partial<InsertScheduledPayment>): Promise<ScheduledPayment | undefined>;
  deleteScheduledPayment(id: number): Promise<boolean>;

  // SMS Logs
  createSmsLog(smsLog: InsertSmsLog): Promise<SmsLog>;
  updateSmsLogTransaction(id: number, transactionId: number): Promise<SmsLog | undefined>;

  // Payment Occurrences
  getPaymentOccurrences(filters?: { month?: number; year?: number; scheduledPaymentId?: number }): Promise<(PaymentOccurrence & { scheduledPayment?: ScheduledPayment })[]>;
  getPaymentOccurrence(id: number): Promise<PaymentOccurrence | undefined>;
  createPaymentOccurrence(occurrence: InsertPaymentOccurrence): Promise<PaymentOccurrence>;
  updatePaymentOccurrence(id: number, data: Partial<InsertPaymentOccurrence>): Promise<PaymentOccurrence | undefined>;
  generatePaymentOccurrencesForMonth(month: number, year: number): Promise<PaymentOccurrence[]>;

  // Savings Goals
  getAllSavingsGoals(userId?: number): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, goal: Partial<InsertSavingsGoal>): Promise<SavingsGoal | undefined>;
  deleteSavingsGoal(id: number): Promise<boolean>;

  // Savings Contributions
  getSavingsContributions(goalId: number): Promise<SavingsContribution[]>;
  getSavingsContribution(id: number): Promise<SavingsContribution | undefined>;
  createSavingsContribution(contribution: InsertSavingsContribution): Promise<SavingsContribution>;
  deleteSavingsContribution(id: number): Promise<boolean>;

  // Salary Profiles
  getSalaryProfile(userId?: number): Promise<SalaryProfile | undefined>;
  createSalaryProfile(profile: InsertSalaryProfile): Promise<SalaryProfile>;
  updateSalaryProfile(id: number, profile: Partial<InsertSalaryProfile>): Promise<SalaryProfile | undefined>;

  // Salary Cycles
  getSalaryCycles(profileId: number, limit?: number): Promise<SalaryCycle[]>;
  getSalaryCycle(id: number): Promise<SalaryCycle | undefined>;
  createSalaryCycle(cycle: InsertSalaryCycle): Promise<SalaryCycle>;
  updateSalaryCycle(id: number, cycle: Partial<InsertSalaryCycle>): Promise<SalaryCycle | undefined>;

  // Dashboard Analytics
  getDashboardStats(userId?: number): Promise<DashboardStats>;

  // Loans
  getAllLoans(userId?: number): Promise<LoanWithRelations[]>;
  getLoan(id: number): Promise<LoanWithRelations | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan | undefined>;
  deleteLoan(id: number): Promise<boolean>;

  // Loan Components
  getLoanComponents(loanId: number): Promise<LoanComponent[]>;
  createLoanComponent(component: InsertLoanComponent): Promise<LoanComponent>;
  updateLoanComponent(id: number, component: Partial<InsertLoanComponent>): Promise<LoanComponent | undefined>;
  deleteLoanComponent(id: number): Promise<boolean>;

  // Loan Installments
  getLoanInstallments(loanId: number): Promise<LoanInstallment[]>;
  getLoanInstallment(id: number): Promise<LoanInstallment | undefined>;
  createLoanInstallment(installment: InsertLoanInstallment): Promise<LoanInstallment>;
  updateLoanInstallment(id: number, installment: Partial<InsertLoanInstallment>): Promise<LoanInstallment | undefined>;
  generateLoanInstallments(loanId: number): Promise<LoanInstallment[]>;
  markInstallmentPaid(id: number, paidAmount: string, transactionId?: number): Promise<LoanInstallment | undefined>;

  // Card Details
  getCardDetails(accountId: number): Promise<CardDetails | undefined>;
  createCardDetails(card: InsertCardDetails): Promise<CardDetails>;
  updateCardDetails(id: number, card: Partial<InsertCardDetails>): Promise<CardDetails | undefined>;
  deleteCardDetails(id: number): Promise<boolean>;

  // Loan Terms
  getLoanTerms(loanId: number): Promise<LoanTerm[]>;
  getLoanTerm(id: number): Promise<LoanTerm | undefined>;
  createLoanTerm(term: InsertLoanTerm): Promise<LoanTerm>;
  updateLoanTerm(id: number, term: Partial<InsertLoanTerm>): Promise<LoanTerm | undefined>;

  // Loan Payments
  getLoanPayments(loanId: number): Promise<LoanPayment[]>;
  getLoanPayment(id: number): Promise<LoanPayment | undefined>;
  createLoanPayment(payment: InsertLoanPayment): Promise<LoanPayment>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ ...user, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  // Accounts
  async getAllAccounts(userId?: number): Promise<Account[]> {
    if (userId) {
      return db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(accounts.name);
    }
    return db.select().from(accounts).orderBy(accounts.name);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getDefaultAccount(): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.isDefault, true));
    return account || undefined;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    // If setting as default, unset all other defaults
    if (account.isDefault) {
      await db.update(accounts).set({ isDefault: false }).where(eq(accounts.isDefault, true));
    }
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined> {
    // If setting as default, unset all other defaults
    if (account.isDefault) {
      await db.update(accounts).set({ isDefault: false }).where(eq(accounts.isDefault, true));
    }
    const [updated] = await db.update(accounts).set({ ...account, updatedAt: new Date() }).where(eq(accounts.id, id)).returning();
    return updated || undefined;
  }

  async deleteAccount(id: number): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    return result.length > 0;
  }

  async updateAccountBalance(id: number, amount: string, type: 'add' | 'subtract'): Promise<Account | undefined> {
    const account = await this.getAccount(id);
    if (!account) return undefined;
    
    const currentBalance = parseFloat(account.balance || "0");
    const changeAmount = parseFloat(amount);
    const newBalance = type === 'add' ? currentBalance + changeAmount : currentBalance - changeAmount;
    
    const [updated] = await db.update(accounts)
      .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return updated || undefined;
  }

  // Categories
  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async seedDefaultCategories(): Promise<void> {
    const existing = await this.getAllCategories();
    if (existing.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await db.insert(categories).values(cat).onConflictDoNothing();
      }
    }
  }

  // Transactions
  async getAllTransactions(filters?: {
    userId?: number;
    accountId?: number;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
  }): Promise<TransactionWithRelations[]> {
    let query = db.select({
      id: transactions.id,
      userId: transactions.userId,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      type: transactions.type,
      description: transactions.description,
      merchant: transactions.merchant,
      referenceNumber: transactions.referenceNumber,
      transactionDate: transactions.transactionDate,
      smsId: transactions.smsId,
      isRecurring: transactions.isRecurring,
      savingsContributionId: transactions.savingsContributionId,
      paymentOccurrenceId: transactions.paymentOccurrenceId,
      createdAt: transactions.createdAt,
      account: accounts,
      category: categories,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(desc(transactions.transactionDate))
    .$dynamic();

    const conditions = [];

    if (filters?.userId) {
      conditions.push(eq(transactions.userId, filters.userId));
    }
    if (filters?.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    if (filters?.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    if (filters?.startDate) {
      conditions.push(gte(transactions.transactionDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactions.transactionDate, filters.endDate));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${filters.search}%`),
          ilike(transactions.merchant, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const results = await query;
    return results as TransactionWithRelations[];
  }

  async getTransaction(id: number): Promise<TransactionWithRelations | undefined> {
    const [result] = await db.select({
      id: transactions.id,
      userId: transactions.userId,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      type: transactions.type,
      description: transactions.description,
      merchant: transactions.merchant,
      referenceNumber: transactions.referenceNumber,
      transactionDate: transactions.transactionDate,
      smsId: transactions.smsId,
      isRecurring: transactions.isRecurring,
      savingsContributionId: transactions.savingsContributionId,
      paymentOccurrenceId: transactions.paymentOccurrenceId,
      createdAt: transactions.createdAt,
      account: accounts,
      category: categories,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.id, id));

    return result as TransactionWithRelations || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values({
      ...transaction,
      transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : new Date(),
    }).returning();

    // Update account balance
    if (transaction.accountId) {
      const balanceType = transaction.type === 'debit' ? 'subtract' : 'add';
      await this.updateAccountBalance(transaction.accountId, transaction.amount, balanceType);
    }

    return newTransaction;
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const oldTransaction = await this.getTransaction(id);
    if (!oldTransaction) {
      throw new Error('Transaction not found');
    }

    // Reverse old balance changes if account changed or amount changed
    if (oldTransaction.accountId) {
      const oldBalanceType = oldTransaction.type === 'debit' ? 'add' : 'subtract';
      await this.updateAccountBalance(oldTransaction.accountId, oldTransaction.amount, oldBalanceType);
    }

    // Update the transaction
    const updateData: any = { ...updates };
    if (updates.transactionDate) {
      updateData.transactionDate = new Date(updates.transactionDate);
    }

    const [updatedTransaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();

    // Apply new balance changes
    const newAccountId = updates.accountId !== undefined ? updates.accountId : oldTransaction.accountId;
    const newAmount = updates.amount !== undefined ? updates.amount : oldTransaction.amount;
    const newType = updates.type !== undefined ? updates.type : oldTransaction.type;

    if (newAccountId) {
      const newBalanceType = newType === 'debit' ? 'subtract' : 'add';
      await this.updateAccountBalance(newAccountId, newAmount, newBalanceType);
    }

    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const transaction = await this.getTransaction(id);
    if (transaction) {
      // Reverse the balance change
      if (transaction.accountId) {
        const balanceType = transaction.type === 'debit' ? 'add' : 'subtract';
        await this.updateAccountBalance(transaction.accountId, transaction.amount, balanceType);
      }
    }
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }

  // Budgets
  async getAllBudgets(filters?: { userId?: number; month?: number; year?: number }): Promise<Budget[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(budgets.userId, filters.userId));
    }
    if (filters?.month) {
      conditions.push(eq(budgets.month, filters.month));
    }
    if (filters?.year) {
      conditions.push(eq(budgets.year, filters.year));
    }

    const query = db.select({
      id: budgets.id,
      userId: budgets.userId,
      categoryId: budgets.categoryId,
      amount: budgets.amount,
      month: budgets.month,
      year: budgets.year,
      createdAt: budgets.createdAt,
      category: categories,
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id));

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  }

  async getBudget(id: number): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget || undefined;
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db.insert(budgets).values(budget).returning();
    return newBudget;
  }

  async updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updated] = await db.update(budgets).set(budget).where(eq(budgets.id, id)).returning();
    return updated || undefined;
  }

  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id)).returning();
    return result.length > 0;
  }

  // Scheduled Payments
  async getAllScheduledPayments(userId?: number): Promise<ScheduledPayment[]> {
    if (userId) {
      return db.select().from(scheduledPayments).where(eq(scheduledPayments.userId, userId)).orderBy(scheduledPayments.dueDate);
    }
    return db.select().from(scheduledPayments).orderBy(scheduledPayments.dueDate);
  }

  async getScheduledPayment(id: number): Promise<ScheduledPayment | undefined> {
    const [payment] = await db.select().from(scheduledPayments).where(eq(scheduledPayments.id, id));
    return payment || undefined;
  }

  async createScheduledPayment(payment: InsertScheduledPayment): Promise<ScheduledPayment> {
    const [newPayment] = await db.insert(scheduledPayments).values(payment).returning();
    return newPayment;
  }

  async updateScheduledPayment(id: number, payment: Partial<InsertScheduledPayment>): Promise<ScheduledPayment | undefined> {
    const [updated] = await db.update(scheduledPayments)
      .set({ ...payment, updatedAt: new Date() })
      .where(eq(scheduledPayments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteScheduledPayment(id: number): Promise<boolean> {
    // First delete all payment occurrences for this scheduled payment
    await db.delete(paymentOccurrences).where(eq(paymentOccurrences.scheduledPaymentId, id));
    
    // Then delete the scheduled payment
    const result = await db.delete(scheduledPayments).where(eq(scheduledPayments.id, id)).returning();
    return result.length > 0;
  }

  // SMS Logs
  async createSmsLog(smsLog: InsertSmsLog): Promise<SmsLog> {
    const [newLog] = await db.insert(smsLogs).values({
      ...smsLog,
      receivedAt: smsLog.receivedAt ? new Date(smsLog.receivedAt) : new Date(),
    }).returning();
    return newLog;
  }

  async updateSmsLogTransaction(id: number, transactionId: number): Promise<SmsLog | undefined> {
    const [updated] = await db.update(smsLogs)
      .set({ transactionId, isParsed: true })
      .where(eq(smsLogs.id, id))
      .returning();
    return updated || undefined;
  }

  // Dashboard Analytics
  async getDashboardStats(userId?: number): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get today's spending
    const todayTransactions = await this.getAllTransactions({
      userId,
      startDate: startOfToday,
      endDate: now,
    });
    const totalSpentToday = todayTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Get monthly spending
    const monthTransactions = await this.getAllTransactions({
      userId,
      startDate: startOfMonth,
      endDate: endOfMonth,
    });
    const totalSpentMonth = monthTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Get monthly expenses by category
    const categoryTotals = new Map<number, { name: string; total: number; color: string }>();
    for (const t of monthTransactions.filter(t => t.type === 'debit')) {
      if (t.categoryId && t.category) {
        const existing = categoryTotals.get(t.categoryId) || { name: t.category.name, total: 0, color: t.category.color || '#9E9E9E' };
        existing.total += parseFloat(t.amount);
        categoryTotals.set(t.categoryId, existing);
      }
    }
    const monthlyExpensesByCategory = Array.from(categoryTotals.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      total: data.total,
      color: data.color,
    })).sort((a, b) => b.total - a.total);

    // Get budget usage
    const monthBudgets = await this.getAllBudgets({ userId, month: now.getMonth() + 1, year: now.getFullYear() });
    const allCategories = await this.getAllCategories();
    const budgetUsage = monthBudgets.map(b => {
      const category = allCategories.find(c => c.id === b.categoryId);
      const spent = categoryTotals.get(b.categoryId!)?.total || 0;
      const budgetAmount = parseFloat(b.amount);
      return {
        categoryId: b.categoryId!,
        categoryName: category?.name || 'Unknown',
        spent,
        budget: budgetAmount,
        percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
      };
    });

    // Get next scheduled payment
    const allPayments = await this.getAllScheduledPayments(userId);
    const activePayments = allPayments.filter(p => p.status === 'active');
    const today = now.getDate();
    const upcomingPayments = activePayments.filter(p => p.dueDate >= today).sort((a, b) => a.dueDate - b.dueDate);
    const nextScheduledPayment = upcomingPayments[0] || null;

    // Get last 5 transactions
    const lastTransactions = await this.getAllTransactions({ userId, limit: 5 });

    // Get upcoming bills (next 7 days)
    const upcomingBills = activePayments.filter(p => {
      const dueDay = p.dueDate;
      return dueDay >= today && dueDay <= today + 7;
    });

    return {
      totalSpentToday,
      totalSpentMonth,
      monthlyExpensesByCategory,
      budgetUsage,
      nextScheduledPayment,
      lastTransactions,
      upcomingBills,
    };
  }

  // Payment Occurrences
  async getPaymentOccurrences(filters?: { month?: number; year?: number; scheduledPaymentId?: number }): Promise<(PaymentOccurrence & { scheduledPayment?: ScheduledPayment })[]> {
    const conditions = [];
    
    if (filters?.month) {
      conditions.push(eq(paymentOccurrences.month, filters.month));
    }
    if (filters?.year) {
      conditions.push(eq(paymentOccurrences.year, filters.year));
    }
    if (filters?.scheduledPaymentId) {
      conditions.push(eq(paymentOccurrences.scheduledPaymentId, filters.scheduledPaymentId));
    }

    const results = await db.select({
      id: paymentOccurrences.id,
      scheduledPaymentId: paymentOccurrences.scheduledPaymentId,
      month: paymentOccurrences.month,
      year: paymentOccurrences.year,
      dueDate: paymentOccurrences.dueDate,
      status: paymentOccurrences.status,
      paidAt: paymentOccurrences.paidAt,
      paidAmount: paymentOccurrences.paidAmount,
      notes: paymentOccurrences.notes,
      createdAt: paymentOccurrences.createdAt,
      scheduledPayment: scheduledPayments,
    })
    .from(paymentOccurrences)
    .leftJoin(scheduledPayments, eq(paymentOccurrences.scheduledPaymentId, scheduledPayments.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(paymentOccurrences.dueDate);

    return results as (PaymentOccurrence & { scheduledPayment?: ScheduledPayment })[];
  }

  async getPaymentOccurrence(id: number): Promise<PaymentOccurrence | undefined> {
    const [occurrence] = await db.select().from(paymentOccurrences).where(eq(paymentOccurrences.id, id));
    return occurrence || undefined;
  }

  async createPaymentOccurrence(occurrence: InsertPaymentOccurrence): Promise<PaymentOccurrence> {
    const [newOccurrence] = await db.insert(paymentOccurrences).values({
      ...occurrence,
      dueDate: occurrence.dueDate ? new Date(occurrence.dueDate) : new Date(),
    }).returning();
    return newOccurrence;
  }

  async updatePaymentOccurrence(id: number, data: Partial<InsertPaymentOccurrence>): Promise<PaymentOccurrence | undefined> {
    const updateData: any = { ...data };
    if (data.status === 'paid' && !data.paidAt) {
      updateData.paidAt = new Date();
    }
    const [updated] = await db.update(paymentOccurrences)
      .set(updateData)
      .where(eq(paymentOccurrences.id, id))
      .returning();
    return updated || undefined;
  }

  async generatePaymentOccurrencesForMonth(month: number, year: number): Promise<PaymentOccurrence[]> {
    const allPayments = await this.getAllScheduledPayments();
    const activePayments = allPayments.filter(p => p.status === 'active');
    const generatedOccurrences: PaymentOccurrence[] = [];

    for (const payment of activePayments) {
      const frequency = payment.frequency || 'monthly';
      const startMonth = payment.startMonth;

      let shouldCreate = false;
      switch (frequency) {
        case 'monthly':
          shouldCreate = true;
          break;
        case 'quarterly':
          if (startMonth) {
            const quarterMonths = [startMonth];
            for (let i = 1; i < 4; i++) {
              quarterMonths.push(((startMonth - 1 + i * 3) % 12) + 1);
            }
            shouldCreate = quarterMonths.includes(month);
          } else {
            shouldCreate = [1, 4, 7, 10].includes(month);
          }
          break;
        case 'half_yearly':
          if (startMonth) {
            shouldCreate = month === startMonth || month === ((startMonth + 5) % 12) + 1;
          } else {
            shouldCreate = month === 1 || month === 7;
          }
          break;
        case 'yearly':
          shouldCreate = startMonth ? month === startMonth : month === 1;
          break;
        case 'one_time':
          shouldCreate = false;
          break;
        default:
          shouldCreate = true;
      }

      if (shouldCreate) {
        const existing = await db.select().from(paymentOccurrences)
          .where(and(
            eq(paymentOccurrences.scheduledPaymentId, payment.id),
            eq(paymentOccurrences.month, month),
            eq(paymentOccurrences.year, year)
          ));

        if (existing.length === 0) {
          const dueDay = Math.min(payment.dueDate, new Date(year, month, 0).getDate());
          const dueDateObj = new Date(year, month - 1, dueDay);
          const [newOccurrence] = await db.insert(paymentOccurrences).values({
            scheduledPaymentId: payment.id,
            month,
            year,
            dueDate: dueDateObj,
            status: 'pending',
          }).returning();
          generatedOccurrences.push(newOccurrence);
        }
      }
    }

    return generatedOccurrences;
  }

  // Savings Goals
  async getAllSavingsGoals(userId?: number): Promise<SavingsGoal[]> {
    if (userId) {
      return db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)).orderBy(desc(savingsGoals.createdAt));
    }
    return db.select().from(savingsGoals).orderBy(desc(savingsGoals.createdAt));
  }

  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    const [goal] = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id));
    return goal || undefined;
  }

  async createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal> {
    const [newGoal] = await db.insert(savingsGoals).values(goal).returning();
    return newGoal;
  }

  async updateSavingsGoal(id: number, goal: Partial<InsertSavingsGoal>): Promise<SavingsGoal | undefined> {
    const [updated] = await db.update(savingsGoals)
      .set({ ...goal, updatedAt: new Date() })
      .where(eq(savingsGoals.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSavingsGoal(id: number): Promise<boolean> {
    console.log(`[deleteSavingsGoal] Starting deletion of goal ${id}`);
    
    // Get the goal to access account configuration
    const [goal] = await db.select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id));
    
    if (!goal) {
      console.log(`[deleteSavingsGoal] Goal ${id} not found`);
      return false;
    }
    
    console.log(`[deleteSavingsGoal] Goal found: ${goal.name}, accountId: ${goal.accountId}, toAccountId: ${goal.toAccountId}`);
    
    // Get all contributions before deleting
    const contributions = await db.select()
      .from(savingsContributions)
      .where(eq(savingsContributions.savingsGoalId, id));

    console.log(`[deleteSavingsGoal] Found ${contributions.length} contributions to delete`);

    // Delete all transactions associated with this goal's contributions
    for (const contribution of contributions) {
      console.log(`[deleteSavingsGoal] Processing contribution ${contribution.id}, amount: ${contribution.amount}`);
      
      // Delete transaction from accountId (debit)
      if (contribution.accountId) {
        const fromTransactions = await db.select()
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, contribution.accountId),
              eq(transactions.savingsContributionId, contribution.id)
            )
          );
        
        console.log(`[deleteSavingsGoal] Found ${fromTransactions.length} debit transactions for contribution ${contribution.id}`);
        
        for (const transaction of fromTransactions) {
          console.log(`[deleteSavingsGoal] Deleting debit transaction ${transaction.id}`);
          // Delete transaction (this will automatically update account balance)
          await this.deleteTransaction(transaction.id);
        }
      }
      
      // Delete transaction to toAccountId (credit)
      if (goal.toAccountId) {
        const toTransactions = await db.select()
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, goal.toAccountId),
              eq(transactions.savingsContributionId, contribution.id)
            )
          );
        
        console.log(`[deleteSavingsGoal] Found ${toTransactions.length} credit transactions for contribution ${contribution.id}`);
        
        for (const transaction of toTransactions) {
          console.log(`[deleteSavingsGoal] Deleting credit transaction ${transaction.id}`);
          // Delete transaction (this will automatically update account balance)
          await this.deleteTransaction(transaction.id);
        }
      }
    }

    console.log(`[deleteSavingsGoal] Deleting ${contributions.length} contributions`);
    // Delete all contributions
    await db.delete(savingsContributions).where(eq(savingsContributions.savingsGoalId, id));
    
    console.log(`[deleteSavingsGoal] Deleting goal ${id}`);
    // Delete the savings goal
    const result = await db.delete(savingsGoals).where(eq(savingsGoals.id, id)).returning();
    
    console.log(`[deleteSavingsGoal] Goal deletion complete, success: ${result.length > 0}`);
    return result.length > 0;
  }

  // Savings Contributions
  async getSavingsContributions(goalId: number): Promise<SavingsContribution[]> {
    const contributions = await db.select({
      contribution: savingsContributions,
      account: accounts,
    })
      .from(savingsContributions)
      .leftJoin(accounts, eq(savingsContributions.accountId, accounts.id))
      .where(eq(savingsContributions.savingsGoalId, goalId))
      .orderBy(desc(savingsContributions.contributedAt));
    
    return contributions.map(c => ({
      ...c.contribution,
      account: c.account || undefined,
    })) as any;
  }

  async getSavingsContribution(id: number): Promise<SavingsContribution | undefined> {
    const [contribution] = await db.select()
      .from(savingsContributions)
      .where(eq(savingsContributions.id, id));
    return contribution;
  }

  async createSavingsContribution(contribution: InsertSavingsContribution): Promise<SavingsContribution> {
    const [newContribution] = await db.insert(savingsContributions).values({
      ...contribution,
      contributedAt: contribution.contributedAt ? new Date(contribution.contributedAt) : new Date(),
    }).returning();

    const goal = await this.getSavingsGoal(contribution.savingsGoalId);
    if (goal) {
      const currentAmount = parseFloat(goal.currentAmount || '0');
      const addAmount = parseFloat(contribution.amount);
      await this.updateSavingsGoal(goal.id, {
        currentAmount: (currentAmount + addAmount).toFixed(2),
      });
    }

    return newContribution;
  }

  async deleteSavingsContribution(id: number): Promise<boolean> {
    const contribution = await db.select().from(savingsContributions).where(eq(savingsContributions.id, id));
    if (contribution.length > 0) {
      const goal = await this.getSavingsGoal(contribution[0].savingsGoalId);
      if (goal) {
        const currentAmount = parseFloat(goal.currentAmount || '0');
        const subtractAmount = parseFloat(contribution[0].amount);
        await this.updateSavingsGoal(goal.id, {
          currentAmount: Math.max(0, currentAmount - subtractAmount).toFixed(2),
        });
      }
    }
    const result = await db.delete(savingsContributions).where(eq(savingsContributions.id, id)).returning();
    return result.length > 0;
  }

  // Salary Profiles
  async getSalaryProfile(userId?: number): Promise<SalaryProfile | undefined> {
    if (userId) {
      const [profile] = await db.select().from(salaryProfiles).where(eq(salaryProfiles.userId, userId));
      return profile || undefined;
    }
    const [profile] = await db.select().from(salaryProfiles).limit(1);
    return profile || undefined;
  }

  async createSalaryProfile(profile: InsertSalaryProfile): Promise<SalaryProfile> {
    const [newProfile] = await db.insert(salaryProfiles).values(profile).returning();
    return newProfile;
  }

  async updateSalaryProfile(id: number, profile: Partial<InsertSalaryProfile>): Promise<SalaryProfile | undefined> {
    const [updated] = await db.update(salaryProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(salaryProfiles.id, id))
      .returning();
    return updated || undefined;
  }

  // Salary Cycles
  async getSalaryCycles(profileId: number, limit?: number): Promise<SalaryCycle[]> {
    let query = db.select().from(salaryCycles)
      .where(eq(salaryCycles.salaryProfileId, profileId))
      .orderBy(desc(salaryCycles.year), desc(salaryCycles.month))
      .$dynamic();
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }

  async getSalaryCycle(id: number): Promise<SalaryCycle | undefined> {
    const [cycle] = await db.select().from(salaryCycles).where(eq(salaryCycles.id, id));
    return cycle || undefined;
  }

  async createSalaryCycle(cycle: InsertSalaryCycle): Promise<SalaryCycle> {
    const [newCycle] = await db.insert(salaryCycles).values({
      ...cycle,
      expectedPayDate: cycle.expectedPayDate ? new Date(cycle.expectedPayDate) : new Date(),
      actualPayDate: cycle.actualPayDate ? new Date(cycle.actualPayDate) : undefined,
    }).returning();
    return newCycle;
  }

  async updateSalaryCycle(id: number, cycle: Partial<InsertSalaryCycle>): Promise<SalaryCycle | undefined> {
    const updateData: any = { ...cycle };
    if (cycle.actualPayDate) {
      updateData.actualPayDate = new Date(cycle.actualPayDate);
    }
    const [updated] = await db.update(salaryCycles)
      .set(updateData)
      .where(eq(salaryCycles.id, id))
      .returning();
    return updated || undefined;
  }

  // Loans
  async getAllLoans(userId?: number): Promise<LoanWithRelations[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(loans.userId, userId));
    }
    
    const results = await db.select({
      id: loans.id,
      userId: loans.userId,
      accountId: loans.accountId,
      name: loans.name,
      type: loans.type,
      lenderName: loans.lenderName,
      loanAccountNumber: loans.loanAccountNumber,
      principalAmount: loans.principalAmount,
      outstandingAmount: loans.outstandingAmount,
      interestRate: loans.interestRate,
      tenure: loans.tenure,
      emiAmount: loans.emiAmount,
      emiDay: loans.emiDay,
      startDate: loans.startDate,
      endDate: loans.endDate,
      status: loans.status,
      notes: loans.notes,
      createdAt: loans.createdAt,
      updatedAt: loans.updatedAt,
      account: accounts,
    })
    .from(loans)
    .leftJoin(accounts, eq(loans.accountId, accounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(loans.createdAt));

    return results as LoanWithRelations[];
  }

  async getLoan(id: number): Promise<LoanWithRelations | undefined> {
    const [result] = await db.select({
      id: loans.id,
      userId: loans.userId,
      accountId: loans.accountId,
      name: loans.name,
      type: loans.type,
      lenderName: loans.lenderName,
      loanAccountNumber: loans.loanAccountNumber,
      principalAmount: loans.principalAmount,
      outstandingAmount: loans.outstandingAmount,
      interestRate: loans.interestRate,
      tenure: loans.tenure,
      emiAmount: loans.emiAmount,
      emiDay: loans.emiDay,
      startDate: loans.startDate,
      endDate: loans.endDate,
      status: loans.status,
      notes: loans.notes,
      createdAt: loans.createdAt,
      updatedAt: loans.updatedAt,
      account: accounts,
    })
    .from(loans)
    .leftJoin(accounts, eq(loans.accountId, accounts.id))
    .where(eq(loans.id, id));

    if (!result) return undefined;

    const installments = await this.getLoanInstallments(id);
    const components = await this.getLoanComponents(id);

    return { ...result, installments, components } as LoanWithRelations;
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    const [newLoan] = await db.insert(loans).values({
      ...loan,
      startDate: loan.startDate ? new Date(loan.startDate) : new Date(),
      endDate: loan.endDate ? new Date(loan.endDate) : undefined,
    }).returning();
    return newLoan;
  }

  async updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan | undefined> {
    const updateData: any = { ...loan, updatedAt: new Date() };
    if (loan.startDate) {
      updateData.startDate = new Date(loan.startDate);
    }
    if (loan.endDate) {
      updateData.endDate = new Date(loan.endDate);
    }
    const [updated] = await db.update(loans)
      .set(updateData)
      .where(eq(loans.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLoan(id: number): Promise<boolean> {
    // Delete related installments and components first
    await db.delete(loanInstallments).where(eq(loanInstallments.loanId, id));
    await db.delete(loanComponents).where(eq(loanComponents.loanId, id));
    const result = await db.delete(loans).where(eq(loans.id, id)).returning();
    return result.length > 0;
  }

  // Loan Components
  async getLoanComponents(loanId: number): Promise<LoanComponent[]> {
    return db.select().from(loanComponents)
      .where(eq(loanComponents.loanId, loanId))
      .orderBy(desc(loanComponents.createdAt));
  }

  async createLoanComponent(component: InsertLoanComponent): Promise<LoanComponent> {
    const [newComponent] = await db.insert(loanComponents).values({
      ...component,
      startDate: component.startDate ? new Date(component.startDate) : new Date(),
      endDate: component.endDate ? new Date(component.endDate) : undefined,
    }).returning();
    return newComponent;
  }

  async updateLoanComponent(id: number, component: Partial<InsertLoanComponent>): Promise<LoanComponent | undefined> {
    const updateData: any = { ...component };
    if (component.startDate) {
      updateData.startDate = new Date(component.startDate);
    }
    if (component.endDate) {
      updateData.endDate = new Date(component.endDate);
    }
    const [updated] = await db.update(loanComponents)
      .set(updateData)
      .where(eq(loanComponents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLoanComponent(id: number): Promise<boolean> {
    await db.delete(loanInstallments).where(eq(loanInstallments.loanComponentId, id));
    const result = await db.delete(loanComponents).where(eq(loanComponents.id, id)).returning();
    return result.length > 0;
  }

  // Loan Installments
  async getLoanInstallments(loanId: number): Promise<LoanInstallment[]> {
    return db.select().from(loanInstallments)
      .where(eq(loanInstallments.loanId, loanId))
      .orderBy(loanInstallments.installmentNumber);
  }

  async getLoanInstallment(id: number): Promise<LoanInstallment | undefined> {
    const [installment] = await db.select().from(loanInstallments).where(eq(loanInstallments.id, id));
    return installment || undefined;
  }

  async createLoanInstallment(installment: InsertLoanInstallment): Promise<LoanInstallment> {
    const [newInstallment] = await db.insert(loanInstallments).values({
      ...installment,
      dueDate: installment.dueDate ? new Date(installment.dueDate) : new Date(),
      paidDate: installment.paidDate ? new Date(installment.paidDate) : undefined,
    }).returning();
    return newInstallment;
  }

  async updateLoanInstallment(id: number, installment: Partial<InsertLoanInstallment>): Promise<LoanInstallment | undefined> {
    const updateData: any = { ...installment };
    if (installment.dueDate) {
      updateData.dueDate = new Date(installment.dueDate);
    }
    if (installment.paidDate) {
      updateData.paidDate = new Date(installment.paidDate);
    }
    const [updated] = await db.update(loanInstallments)
      .set(updateData)
      .where(eq(loanInstallments.id, id))
      .returning();
    return updated || undefined;
  }

  async generateLoanInstallments(loanId: number): Promise<LoanInstallment[]> {
    const loan = await this.getLoan(loanId);
    if (!loan || !loan.emiAmount || !loan.tenure) return [];

    // Delete existing installments for this loan
    await db.delete(loanInstallments).where(eq(loanInstallments.loanId, loanId));

    const generatedInstallments: LoanInstallment[] = [];
    const startDate = new Date(loan.startDate);
    const emiAmount = parseFloat(loan.emiAmount);
    const principal = parseFloat(loan.principalAmount);
    const interestRate = parseFloat(loan.interestRate) / 100 / 12; // Monthly rate
    const emiDay = loan.emiDay || startDate.getDate();

    let remainingPrincipal = principal;

    for (let i = 1; i <= loan.tenure; i++) {
      // Calculate interest and principal for this installment
      const interestAmount = remainingPrincipal * interestRate;
      const principalAmount = emiAmount - interestAmount;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalAmount);

      // Calculate due date
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(Math.min(emiDay, new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()));

      const [newInstallment] = await db.insert(loanInstallments).values({
        loanId,
        installmentNumber: i,
        dueDate,
        emiAmount: emiAmount.toFixed(2),
        principalAmount: principalAmount.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        status: 'pending',
      }).returning();

      generatedInstallments.push(newInstallment);
    }

    return generatedInstallments;
  }

  async markInstallmentPaid(id: number, paidAmount: string, transactionId?: number): Promise<LoanInstallment | undefined> {
    const installment = await this.getLoanInstallment(id);
    if (!installment) return undefined;

    const [updated] = await db.update(loanInstallments)
      .set({
        status: 'paid',
        paidAmount,
        paidDate: new Date(),
        transactionId,
      })
      .where(eq(loanInstallments.id, id))
      .returning();

    // Update loan outstanding amount
    if (updated && installment.principalAmount) {
      const loan = await db.select().from(loans).where(eq(loans.id, installment.loanId));
      if (loan.length > 0) {
        const currentOutstanding = parseFloat(loan[0].outstandingAmount);
        const principalPaid = parseFloat(installment.principalAmount);
        await db.update(loans)
          .set({
            outstandingAmount: Math.max(0, currentOutstanding - principalPaid).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(loans.id, installment.loanId));
      }
    }

    return updated || undefined;
  }

  // Card Details
  async getCardDetails(accountId: number): Promise<CardDetails | undefined> {
    const [card] = await db.select().from(cardDetails).where(eq(cardDetails.accountId, accountId));
    return card || undefined;
  }

  async createCardDetails(card: InsertCardDetails): Promise<CardDetails> {
    const [newCard] = await db.insert(cardDetails).values(card).returning();
    return newCard;
  }

  async updateCardDetails(id: number, card: Partial<InsertCardDetails>): Promise<CardDetails | undefined> {
    const [updated] = await db.update(cardDetails)
      .set({ ...card, updatedAt: new Date() })
      .where(eq(cardDetails.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCardDetails(id: number): Promise<boolean> {
    const result = await db.delete(cardDetails).where(eq(cardDetails.id, id)).returning();
    return result.length > 0;
  }

  // Loan Terms
  async getLoanTerms(loanId: number): Promise<LoanTerm[]> {
    return db.select().from(loanTerms)
      .where(eq(loanTerms.loanId, loanId))
      .orderBy(desc(loanTerms.effectiveFrom));
  }

  async getLoanTerm(id: number): Promise<LoanTerm | undefined> {
    const [term] = await db.select().from(loanTerms).where(eq(loanTerms.id, id));
    return term || undefined;
  }

  async createLoanTerm(term: InsertLoanTerm): Promise<LoanTerm> {
    // Close any existing open term (set effectiveTo)
    const openTerms = await db.select().from(loanTerms)
      .where(and(eq(loanTerms.loanId, term.loanId), sql`${loanTerms.effectiveTo} IS NULL`));
    
    for (const openTerm of openTerms) {
      await db.update(loanTerms)
        .set({ effectiveTo: term.effectiveFrom })
        .where(eq(loanTerms.id, openTerm.id));
    }

    const [newTerm] = await db.insert(loanTerms).values(term).returning();
    
    // Update the loan with new interest rate, tenure, and EMI
    await db.update(loans).set({
      interestRate: term.interestRate,
      tenure: term.tenureMonths,
      emiAmount: term.emiAmount,
      updatedAt: new Date()
    }).where(eq(loans.id, term.loanId));

    return newTerm;
  }

  async updateLoanTerm(id: number, term: Partial<InsertLoanTerm>): Promise<LoanTerm | undefined> {
    const [updated] = await db.update(loanTerms).set(term).where(eq(loanTerms.id, id)).returning();
    return updated || undefined;
  }

  // Loan Payments
  async getLoanPayments(loanId: number): Promise<LoanPayment[]> {
    return db.select().from(loanPayments)
      .where(eq(loanPayments.loanId, loanId))
      .orderBy(desc(loanPayments.paymentDate));
  }

  async getLoanPayment(id: number): Promise<LoanPayment | undefined> {
    const [payment] = await db.select().from(loanPayments).where(eq(loanPayments.id, id));
    return payment || undefined;
  }

  async createLoanPayment(payment: InsertLoanPayment): Promise<LoanPayment> {
    let principalPaid = payment.principalPaid ? parseFloat(payment.principalPaid) : 0;
    
    // If payment is linked to an installment and principalPaid not specified, get from installment
    if (payment.installmentId && !payment.principalPaid) {
      const installment = await this.getLoanInstallment(payment.installmentId);
      if (installment) {
        principalPaid = parseFloat(installment.principalComponent || '0');
      }
    }
    
    // For prepayments, assume full amount reduces principal
    if (payment.paymentType === 'prepayment' && !payment.principalPaid) {
      principalPaid = parseFloat(payment.amount);
    }

    const [newPayment] = await db.insert(loanPayments).values({
      ...payment,
      principalPaid: principalPaid.toFixed(2)
    }).returning();

    // Update outstanding amount - only subtract principal component
    const loan = await this.getLoan(payment.loanId);
    if (loan && principalPaid > 0) {
      const currentOutstanding = parseFloat(loan.outstandingAmount) || 0;
      const newOutstanding = Math.max(0, currentOutstanding - principalPaid);
      
      await db.update(loans).set({
        outstandingAmount: newOutstanding.toFixed(2),
        updatedAt: new Date()
      }).where(eq(loans.id, payment.loanId));
    }

    // If linked to an installment, mark it as paid
    if (payment.installmentId) {
      await this.updateLoanInstallment(payment.installmentId, {
        status: 'paid',
        paidAmount: payment.amount,
        paidDate: typeof payment.paymentDate === 'string' ? new Date(payment.paymentDate) : payment.paymentDate
      });
    }

    return newPayment;
  }
}

export const storage = new DatabaseStorage();
