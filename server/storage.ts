import { 
  users, accounts, categories, transactions, budgets, scheduledPayments, smsLogs,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction, type TransactionWithRelations,
  type Budget, type InsertBudget,
  type ScheduledPayment, type InsertScheduledPayment,
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

  // Dashboard Analytics
  getDashboardStats(userId?: number): Promise<DashboardStats>;
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

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined> {
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

    if (conditions.length > 0) {
      return db.select().from(budgets).where(and(...conditions));
    }
    return db.select().from(budgets);
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
}

export const storage = new DatabaseStorage();
