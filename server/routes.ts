import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAccountSchema, 
  insertTransactionSchema, 
  insertBudgetSchema, 
  insertScheduledPaymentSchema,
  insertSmsLogSchema,
  insertCategorySchema
} from "@shared/schema";
import { suggestCategory, parseSmsMessage } from "./openai";

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
      if (!pin || pin.length !== 4) {
        res.status(400).json({ error: "PIN must be 4 digits" });
        return;
      }
      // Simple hash for demo (in production, use bcrypt)
      const pinHash = Buffer.from(pin).toString('base64');
      const user = await storage.updateUser(1, { pinHash });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set PIN" });
    }
  });

  app.post("/api/user/verify-pin", async (req, res) => {
    try {
      const { pin } = req.body;
      const user = await storage.getUser(1);
      if (!user || !user.pinHash) {
        res.json({ valid: false, message: "No PIN set" });
        return;
      }
      const pinHash = Buffer.from(pin).toString('base64');
      res.json({ valid: pinHash === user.pinHash });
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

  const httpServer = createServer(app);
  return httpServer;
}
