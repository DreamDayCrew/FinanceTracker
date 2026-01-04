import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  insertAccountSchema, 
  insertTransactionSchema, 
  insertBudgetSchema, 
  insertScheduledPaymentSchema,
  insertPaymentOccurrenceSchema,
  insertSavingsGoalSchema,
  insertSavingsContributionSchema,
  insertSalaryProfileSchema,
  insertSalaryCycleSchema,
  insertSmsLogSchema,
  insertCategorySchema,
  insertLoanSchema,
  insertLoanComponentSchema,
  insertLoanInstallmentSchema,
  insertCardDetailsSchema
} from "@shared/schema";
import { suggestCategory, parseSmsMessage } from "./openai";
import { getPaydayForMonth, getNextPaydays } from "./salaryUtils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed default categories on startup
  await storage.seedDefaultCategories();

  // ========== Categories ==========
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid category data" });
    }
  });

  // ========== Accounts ==========
  app.get("/api/accounts", async (_req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const account = await storage.getAccount(parseInt(req.params.id));
      if (account) {
        res.json(account);
      } else {
        res.status(404).json({ error: "Account not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validatedData);
      res.status(201).json(account);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid account data" });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      const account = await storage.updateAccount(parseInt(req.params.id), req.body);
      if (account) {
        res.json(account);
      } else {
        res.status(404).json({ error: "Account not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid account data" });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAccount(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Account not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // ========== Transactions ==========
  app.get("/api/transactions", async (req, res) => {
    try {
      const { accountId, categoryId, startDate, endDate, search, limit } = req.query;
      
      const filters: any = {};
      if (accountId) filters.accountId = parseInt(accountId as string);
      if (categoryId) filters.categoryId = parseInt(categoryId as string);
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (search) filters.search = search as string;
      if (limit) filters.limit = parseInt(limit as string);

      const transactions = await storage.getAllTransactions(filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (transaction) {
        res.json(transaction);
      } else {
        res.status(404).json({ error: "Transaction not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Transaction not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // ========== Budgets ==========
  app.get("/api/budgets", async (req, res) => {
    try {
      const { month, year } = req.query;
      const filters: any = {};
      if (month) filters.month = parseInt(month as string);
      if (year) filters.year = parseInt(year as string);

      const budgets = await storage.getAllBudgets(filters);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const validatedData = insertBudgetSchema.parse(req.body);
      const budget = await storage.createBudget(validatedData);
      res.status(201).json(budget);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid budget data" });
    }
  });

  app.patch("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await storage.updateBudget(parseInt(req.params.id), req.body);
      if (budget) {
        res.json(budget);
      } else {
        res.status(404).json({ error: "Budget not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid budget data" });
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBudget(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Budget not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  // ========== Scheduled Payments ==========
  app.get("/api/scheduled-payments", async (_req, res) => {
    try {
      const payments = await storage.getAllScheduledPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled payments" });
    }
  });

  app.get("/api/scheduled-payments/:id", async (req, res) => {
    try {
      const payment = await storage.getScheduledPayment(parseInt(req.params.id));
      if (payment) {
        res.json(payment);
      } else {
        res.status(404).json({ error: "Scheduled payment not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled payment" });
    }
  });

  app.post("/api/scheduled-payments", async (req, res) => {
    try {
      const validatedData = insertScheduledPaymentSchema.parse(req.body);
      const payment = await storage.createScheduledPayment(validatedData);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.patch("/api/scheduled-payments/:id", async (req, res) => {
    try {
      const payment = await storage.updateScheduledPayment(parseInt(req.params.id), req.body);
      if (payment) {
        res.json(payment);
      } else {
        res.status(404).json({ error: "Scheduled payment not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.delete("/api/scheduled-payments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteScheduledPayment(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Scheduled payment not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scheduled payment" });
    }
  });

  // ========== Payment Occurrences (Monthly Checklist) ==========
  app.get("/api/payment-occurrences", async (req, res) => {
    try {
      const { month, year } = req.query;
      const filters: any = {};
      if (month) filters.month = parseInt(month as string);
      if (year) filters.year = parseInt(year as string);

      const occurrences = await storage.getPaymentOccurrences(filters);
      res.json(occurrences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment occurrences" });
    }
  });

  app.post("/api/payment-occurrences/generate", async (req, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        res.status(400).json({ error: "Month and year are required" });
        return;
      }
      const occurrences = await storage.generatePaymentOccurrencesForMonth(month, year);
      res.json(occurrences);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate payment occurrences" });
    }
  });

  app.patch("/api/payment-occurrences/:id", async (req, res) => {
    try {
      const occurrence = await storage.updatePaymentOccurrence(parseInt(req.params.id), req.body);
      if (occurrence) {
        res.json(occurrence);
      } else {
        res.status(404).json({ error: "Payment occurrence not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment occurrence" });
    }
  });

  // ========== Savings Goals ==========
  app.get("/api/savings-goals", async (_req, res) => {
    try {
      const goals = await storage.getAllSavingsGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch savings goals" });
    }
  });

  app.get("/api/savings-goals/:id", async (req, res) => {
    try {
      const goal = await storage.getSavingsGoal(parseInt(req.params.id));
      if (goal) {
        res.json(goal);
      } else {
        res.status(404).json({ error: "Savings goal not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch savings goal" });
    }
  });

  app.post("/api/savings-goals", async (req, res) => {
    try {
      const validatedData = insertSavingsGoalSchema.parse(req.body);
      const goal = await storage.createSavingsGoal(validatedData);
      res.status(201).json(goal);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid savings goal data" });
    }
  });

  app.patch("/api/savings-goals/:id", async (req, res) => {
    try {
      const goal = await storage.updateSavingsGoal(parseInt(req.params.id), req.body);
      if (goal) {
        res.json(goal);
      } else {
        res.status(404).json({ error: "Savings goal not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update savings goal" });
    }
  });

  app.delete("/api/savings-goals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSavingsGoal(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Savings goal not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete savings goal" });
    }
  });

  // ========== Savings Contributions ==========
  app.get("/api/savings-goals/:goalId/contributions", async (req, res) => {
    try {
      const contributions = await storage.getSavingsContributions(parseInt(req.params.goalId));
      res.json(contributions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contributions" });
    }
  });

  app.post("/api/savings-goals/:goalId/contributions", async (req, res) => {
    try {
      const validatedData = insertSavingsContributionSchema.parse({
        ...req.body,
        savingsGoalId: parseInt(req.params.goalId),
      });
      const contribution = await storage.createSavingsContribution(validatedData);
      res.status(201).json(contribution);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid contribution data" });
    }
  });

  app.delete("/api/savings-contributions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSavingsContribution(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Contribution not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contribution" });
    }
  });

  // ========== Salary Profile ==========
  app.get("/api/salary-profile", async (_req, res) => {
    try {
      const profile = await storage.getSalaryProfile();
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch salary profile" });
    }
  });

  app.post("/api/salary-profile", async (req, res) => {
    try {
      const validatedData = insertSalaryProfileSchema.parse(req.body);
      const profile = await storage.createSalaryProfile(validatedData);
      res.status(201).json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid salary profile data" });
    }
  });

  app.patch("/api/salary-profile/:id", async (req, res) => {
    try {
      const profile = await storage.updateSalaryProfile(parseInt(req.params.id), req.body);
      if (profile) {
        res.json(profile);
      } else {
        res.status(404).json({ error: "Salary profile not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update salary profile" });
    }
  });

  app.get("/api/salary-profile/next-paydays", async (_req, res) => {
    try {
      const profile = await storage.getSalaryProfile();
      if (!profile) {
        res.json([]);
        return;
      }
      const paydays = getNextPaydays(
        profile.paydayRule || 'last_working_day',
        profile.fixedDay,
        profile.weekdayPreference,
        6
      );
      res.json(paydays);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate next paydays" });
    }
  });

  // ========== Salary Cycles ==========
  app.get("/api/salary-cycles", async (req, res) => {
    try {
      const profile = await storage.getSalaryProfile();
      if (!profile) {
        res.json([]);
        return;
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const cycles = await storage.getSalaryCycles(profile.id, limit);
      res.json(cycles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch salary cycles" });
    }
  });

  app.post("/api/salary-cycles", async (req, res) => {
    try {
      const profile = await storage.getSalaryProfile();
      if (!profile) {
        res.status(400).json({ error: "Please create a salary profile first" });
        return;
      }
      const { month, year } = req.body;
      const expectedPayDate = getPaydayForMonth(
        year,
        month,
        profile.paydayRule || 'last_working_day',
        profile.fixedDay,
        profile.weekdayPreference
      );
      const validatedData = insertSalaryCycleSchema.parse({
        ...req.body,
        salaryProfileId: profile.id,
        expectedPayDate: expectedPayDate.toISOString(),
        expectedAmount: profile.monthlyAmount,
      });
      const cycle = await storage.createSalaryCycle(validatedData);
      res.status(201).json(cycle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid salary cycle data" });
    }
  });

  app.patch("/api/salary-cycles/:id", async (req, res) => {
    try {
      const cycle = await storage.updateSalaryCycle(parseInt(req.params.id), req.body);
      if (cycle) {
        res.json(cycle);
      } else {
        res.status(404).json({ error: "Salary cycle not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update salary cycle" });
    }
  });

  // ========== Budget Summary ==========
  app.get("/api/budget-summary", async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

      const budgets = await storage.getAllBudgets({ month: currentMonth, year: currentYear });
      const categories = await storage.getAllCategories();
      
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
      const transactions = await storage.getAllTransactions({
        startDate: startOfMonth,
        endDate: endOfMonth,
      });

      const categorySpending = new Map<number, number>();
      for (const t of transactions.filter(t => t.type === 'debit')) {
        if (t.categoryId) {
          const current = categorySpending.get(t.categoryId) || 0;
          categorySpending.set(t.categoryId, current + parseFloat(t.amount));
        }
      }

      const summary = budgets.map(b => {
        const category = categories.find(c => c.id === b.categoryId);
        const spent = categorySpending.get(b.categoryId!) || 0;
        const budgetAmount = parseFloat(b.amount);
        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          categoryName: category?.name || 'Unknown',
          categoryIcon: category?.icon,
          categoryColor: category?.color,
          budgetAmount,
          spentAmount: spent,
          remainingAmount: budgetAmount - spent,
          percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
        };
      });

      const totalBudget = summary.reduce((sum, s) => sum + s.budgetAmount, 0);
      const totalSpent = summary.reduce((sum, s) => sum + s.spentAmount, 0);

      res.json({
        month: currentMonth,
        year: currentYear,
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        categories: summary,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget summary" });
    }
  });

  // ========== Dashboard ==========
  app.get("/api/dashboard", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ========== AI Category Suggestion ==========
  app.post("/api/suggest-category", async (req, res) => {
    try {
      const { description, merchant } = req.body;
      const text = `${merchant || ""} ${description || ""}`.trim();
      if (!text) {
        res.status(400).json({ error: "Description or merchant required" });
        return;
      }
      const category = await suggestCategory(text);
      res.json({ category });
    } catch (error) {
      res.status(500).json({ error: "Failed to suggest category" });
    }
  });

  // ========== SMS Parsing ==========
  app.post("/api/parse-sms", async (req, res) => {
    try {
      const { sender, message, receivedAt } = req.body;
      
      // Create SMS log
      const smsLog = await storage.createSmsLog({
        sender,
        message,
        receivedAt: receivedAt || new Date().toISOString(),
        isParsed: false,
      });

      // Parse SMS for transaction data
      const parsedData = await parseSmsMessage(message, sender);
      
      if (parsedData && parsedData.amount) {
        // Find or suggest category
        const categoryName = await suggestCategory(parsedData.merchant || parsedData.description || "");
        const category = await storage.getCategoryByName(categoryName);
        
        // Create transaction
        const transaction = await storage.createTransaction({
          amount: parsedData.amount.toString(),
          type: parsedData.type || "debit",
          description: parsedData.description,
          merchant: parsedData.merchant,
          referenceNumber: parsedData.referenceNumber,
          transactionDate: parsedData.date || new Date().toISOString(),
          categoryId: category?.id,
          smsId: smsLog.id,
        });

        // Update SMS log
        await storage.updateSmsLogTransaction(smsLog.id, transaction.id);

        res.json({ 
          success: true, 
          transaction,
          parsed: parsedData 
        });
      } else {
        res.json({ 
          success: false, 
          message: "Could not parse transaction from SMS",
          smsLogId: smsLog.id 
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to parse SMS" });
    }
  });

  // ========== Export Data ==========
  app.post("/api/export", async (req, res) => {
    try {
      const { format, startDate, endDate } = req.body;
      
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      
      const transactions = await storage.getAllTransactions(filters);
      
      if (format === "csv") {
        const headers = ["Date", "Type", "Category", "Merchant", "Amount", "Description", "Account"];
        const rows = transactions.map(t => [
          new Date(t.transactionDate).toLocaleDateString('en-IN'),
          t.type,
          t.category?.name || "",
          t.merchant || "",
          t.amount,
          t.description || "",
          t.account?.name || ""
        ]);
        
        const csv = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
        
        res.json({
          content: csv,
          filename: `finance-tracker-${new Date().toISOString().split('T')[0]}.csv`,
          format: "csv"
        });
      } else if (format === "json") {
        res.json({
          content: JSON.stringify(transactions, null, 2),
          filename: `finance-tracker-${new Date().toISOString().split('T')[0]}.json`,
          format: "json"
        });
      } else {
        res.status(400).json({ error: "Invalid export format. Use 'csv' or 'json'" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // ========== User Settings ==========
  app.get("/api/user", async (_req, res) => {
    try {
      // For single-user app, get or create default user
      let user = await storage.getUser(1);
      if (!user) {
        user = await storage.createUser({ name: "User" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/user", async (req, res) => {
    try {
      const user = await storage.updateUser(1, req.body);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/user/set-pin", async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        res.status(400).json({ error: "PIN must be 4 digits" });
        return;
      }
      const pinHash = await bcrypt.hash(pin, 10);
      await storage.updateUser(1, { pinHash });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set PIN" });
    }
  });

  app.post("/api/user/verify-pin", async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin) {
        res.json({ valid: false, message: "PIN required" });
        return;
      }
      const user = await storage.getUser(1);
      if (!user || !user.pinHash) {
        res.json({ valid: false, message: "No PIN set" });
        return;
      }
      const valid = await bcrypt.compare(pin, user.pinHash);
      res.json({ valid });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify PIN" });
    }
  });

  app.post("/api/user/reset-pin", async (_req, res) => {
    try {
      await storage.updateUser(1, { pinHash: null });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset PIN" });
    }
  });

  // ========== Loans ==========
  app.get("/api/loans", async (_req, res) => {
    try {
      const loans = await storage.getAllLoans();
      res.json(loans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  });

  app.get("/api/loans/:id", async (req, res) => {
    try {
      const loan = await storage.getLoan(parseInt(req.params.id));
      if (loan) {
        res.json(loan);
      } else {
        res.status(404).json({ error: "Loan not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan" });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const validatedData = insertLoanSchema.parse(req.body);
      const loan = await storage.createLoan(validatedData);
      
      // Auto-generate installments if EMI info is provided
      if (loan.emiAmount && loan.tenure) {
        await storage.generateLoanInstallments(loan.id);
      }
      
      res.status(201).json(loan);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid loan data" });
    }
  });

  app.patch("/api/loans/:id", async (req, res) => {
    try {
      const loan = await storage.updateLoan(parseInt(req.params.id), req.body);
      if (loan) {
        res.json(loan);
      } else {
        res.status(404).json({ error: "Loan not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid loan data" });
    }
  });

  app.delete("/api/loans/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLoan(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Loan not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete loan" });
    }
  });

  app.post("/api/loans/:id/generate-schedule", async (req, res) => {
    try {
      const installments = await storage.generateLoanInstallments(parseInt(req.params.id));
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate installments" });
    }
  });

  // ========== Loan Components (for CC EMIs) ==========
  app.get("/api/loans/:loanId/components", async (req, res) => {
    try {
      const components = await storage.getLoanComponents(parseInt(req.params.loanId));
      res.json(components);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan components" });
    }
  });

  app.post("/api/loans/:loanId/components", async (req, res) => {
    try {
      const validatedData = insertLoanComponentSchema.parse({
        ...req.body,
        loanId: parseInt(req.params.loanId)
      });
      const component = await storage.createLoanComponent(validatedData);
      res.status(201).json(component);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid component data" });
    }
  });

  app.patch("/api/loan-components/:id", async (req, res) => {
    try {
      const component = await storage.updateLoanComponent(parseInt(req.params.id), req.body);
      if (component) {
        res.json(component);
      } else {
        res.status(404).json({ error: "Component not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid component data" });
    }
  });

  app.delete("/api/loan-components/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLoanComponent(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Component not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete component" });
    }
  });

  // ========== Loan Installments ==========
  app.get("/api/loans/:loanId/installments", async (req, res) => {
    try {
      const installments = await storage.getLoanInstallments(parseInt(req.params.loanId));
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installments" });
    }
  });

  app.patch("/api/loan-installments/:id", async (req, res) => {
    try {
      const installment = await storage.updateLoanInstallment(parseInt(req.params.id), req.body);
      if (installment) {
        res.json(installment);
      } else {
        res.status(404).json({ error: "Installment not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid installment data" });
    }
  });

  app.post("/api/loan-installments/:id/mark-paid", async (req, res) => {
    try {
      const { paidAmount, transactionId } = req.body;
      const installment = await storage.markInstallmentPaid(
        parseInt(req.params.id), 
        paidAmount, 
        transactionId
      );
      if (installment) {
        res.json(installment);
      } else {
        res.status(404).json({ error: "Installment not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to mark installment as paid" });
    }
  });

  // ========== Loan Summary ==========
  app.get("/api/loan-summary", async (_req, res) => {
    try {
      const allLoans = await storage.getAllLoans();
      const activeLoans = allLoans.filter(l => l.status === 'active');
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      let totalOutstanding = 0;
      let totalEmiThisMonth = 0;
      let nextEmiDue: { loanName: string; amount: string; dueDate: string } | null = null;
      
      for (const loan of activeLoans) {
        totalOutstanding += parseFloat(loan.outstandingAmount);
        
        if (loan.installments) {
          for (const inst of loan.installments) {
            const dueDate = new Date(inst.dueDate);
            if (dueDate.getMonth() + 1 === currentMonth && dueDate.getFullYear() === currentYear) {
              totalEmiThisMonth += parseFloat(inst.emiAmount);
            }
            
            // Find next pending EMI
            if (inst.status === 'pending' && dueDate >= now) {
              if (!nextEmiDue || dueDate < new Date(nextEmiDue.dueDate)) {
                nextEmiDue = {
                  loanName: loan.name,
                  amount: inst.emiAmount,
                  dueDate: inst.dueDate.toISOString()
                };
              }
            }
          }
        }
      }
      
      res.json({
        totalLoans: activeLoans.length,
        totalOutstanding,
        totalEmiThisMonth,
        nextEmiDue
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan summary" });
    }
  });

  // ========== Card Details ==========
  app.get("/api/accounts/:accountId/card", async (req, res) => {
    try {
      const card = await storage.getCardDetails(parseInt(req.params.accountId));
      if (card) {
        // Return masked card number for security
        res.json({
          ...card,
          cardNumber: `****-****-****-${card.lastFourDigits}`
        });
      } else {
        res.status(404).json({ error: "Card not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  app.post("/api/accounts/:accountId/card", async (req, res) => {
    try {
      // Simple encryption for demo - in production use proper encryption
      const cardNumber = req.body.cardNumber.replace(/\s/g, '');
      const lastFourDigits = cardNumber.slice(-4);
      
      // Basic encryption (in production, use AES-256-GCM or similar)
      const encryptedCardNumber = Buffer.from(cardNumber).toString('base64');
      
      const validatedData = insertCardDetailsSchema.parse({
        ...req.body,
        accountId: parseInt(req.params.accountId),
        cardNumber: encryptedCardNumber,
        lastFourDigits
      });
      
      const card = await storage.createCardDetails(validatedData);
      res.status(201).json({
        ...card,
        cardNumber: `****-****-****-${card.lastFourDigits}`
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid card data" });
    }
  });

  app.patch("/api/cards/:id", async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (updateData.cardNumber) {
        updateData.cardNumber = Buffer.from(updateData.cardNumber.replace(/\s/g, '')).toString('base64');
        updateData.lastFourDigits = req.body.cardNumber.slice(-4);
      }
      
      const card = await storage.updateCardDetails(parseInt(req.params.id), updateData);
      if (card) {
        res.json({
          ...card,
          cardNumber: `****-****-****-${card.lastFourDigits}`
        });
      } else {
        res.status(404).json({ error: "Card not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid card data" });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCardDetails(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Card not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete card" });
    }
  });

  // Secure endpoint to get full card number (requires PIN verification in real app)
  app.get("/api/accounts/:accountId/card/full", async (req, res) => {
    try {
      const card = await storage.getCardDetails(parseInt(req.params.accountId));
      if (card) {
        // Decrypt card number
        const decryptedCardNumber = Buffer.from(card.cardNumber, 'base64').toString('utf8');
        res.json({
          ...card,
          cardNumber: decryptedCardNumber
        });
      } else {
        res.status(404).json({ error: "Card not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
