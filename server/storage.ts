import { type Expense, type InsertExpense, type Budget, type InsertBudget, type Bill, type InsertBill } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Expenses
  getAllExpenses(): Promise<Expense[]>;
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;

  // Budgets
  getAllBudgets(): Promise<Budget[]>;
  getBudgetsByMonth(month: number, year: number): Promise<Budget[]>;
  getBudgetByCategory(category: string, month: number, year: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  deleteBudget(id: string): Promise<boolean>;

  // Bills
  getAllBills(): Promise<Bill[]>;
  getBillById(id: string): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  deleteBill(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private expenses: Map<string, Expense>;
  private budgets: Map<string, Budget>;
  private bills: Map<string, Bill>;

  constructor() {
    this.expenses = new Map();
    this.budgets = new Map();
    this.bills = new Map();
  }

  // Expenses
  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = {
      ...insertExpense,
      id,
      date: insertExpense.date ? new Date(insertExpense.date) : new Date(),
      createdAt: new Date(),
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Budgets
  async getAllBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }

  async getBudgetsByMonth(month: number, year: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.month === month && budget.year === year
    );
  }

  async getBudgetByCategory(category: string, month: number, year: number): Promise<Budget | undefined> {
    return Array.from(this.budgets.values()).find(
      (budget) => budget.category === category && budget.month === month && budget.year === year
    );
  }

  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const id = randomUUID();
    const budget: Budget = {
      ...insertBudget,
      id,
      createdAt: new Date(),
    };
    this.budgets.set(id, budget);
    return budget;
  }

  async deleteBudget(id: string): Promise<boolean> {
    return this.budgets.delete(id);
  }

  // Bills
  async getAllBills(): Promise<Bill[]> {
    return Array.from(this.bills.values());
  }

  async getBillById(id: string): Promise<Bill | undefined> {
    return this.bills.get(id);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const id = randomUUID();
    const bill: Bill = {
      ...insertBill,
      id,
      isRecurring: insertBill.isRecurring ?? 1,
      createdAt: new Date(),
    };
    this.bills.set(id, bill);
    return bill;
  }

  async deleteBill(id: string): Promise<boolean> {
    return this.bills.delete(id);
  }
}

export const storage = new MemStorage();
