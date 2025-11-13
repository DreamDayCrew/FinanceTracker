import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExpenseSchema, insertBudgetSchema, insertBillSchema } from "@shared/schema";
import { suggestExpenseCategory } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Expenses routes
  app.get("/api/expenses", async (_req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid expense data" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Expense not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // AI category suggestion
  app.post("/api/expenses/suggest-category", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "Description is required" });
      }
      
      const category = await suggestExpenseCategory(description);
      res.json({ category });
    } catch (error) {
      res.status(500).json({ error: "Failed to suggest category" });
    }
  });

  // Budgets routes
  app.get("/api/budgets", async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      let budgets;
      if (month && year) {
        budgets = await storage.getBudgetsByMonth(month, year);
      } else {
        budgets = await storage.getAllBudgets();
      }
      
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const validatedData = insertBudgetSchema.parse(req.body);
      
      // Check if budget already exists for this category/month/year
      const existing = await storage.getBudgetByCategory(
        validatedData.category,
        validatedData.month,
        validatedData.year
      );
      
      if (existing) {
        return res.status(400).json({ error: "Budget already exists for this category and month" });
      }
      
      const budget = await storage.createBudget(validatedData);
      res.status(201).json(budget);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid budget data" });
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBudget(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Budget not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  // Bills routes
  app.get("/api/bills", async (_req, res) => {
    try {
      const bills = await storage.getAllBills();
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      const validatedData = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(validatedData);
      res.status(201).json(bill);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid bill data" });
    }
  });

  app.delete("/api/bills/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBill(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Bill not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });

  // Export routes
  app.post("/api/export", async (req, res) => {
    try {
      const { format } = req.body;
      const expenses = await storage.getAllExpenses();
      
      if (format === "csv") {
        // Generate CSV
        const headers = ["Date", "Category", "Amount", "Description"];
        const rows = expenses.map(exp => [
          new Date(exp.date).toLocaleDateString('en-IN'),
          exp.category,
          exp.amount,
          exp.description || ""
        ]);
        
        const csv = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
        
        res.json({
          content: csv,
          filename: `finart-expenses-${new Date().toISOString().split('T')[0]}.csv`,
          format: "csv"
        });
      } else if (format === "pdf") {
        // Generate simple PDF-like text content
        const content = [
          "FinArt Expense Report",
          `Generated: ${new Date().toLocaleDateString('en-IN')}`,
          "",
          "---",
          "",
          ...expenses.map(exp => 
            `${new Date(exp.date).toLocaleDateString('en-IN')} | ${exp.category} | ₹${exp.amount} | ${exp.description || "N/A"}`
          ),
          "",
          "---",
          `Total Expenses: ${expenses.length}`,
          `Total Amount: ₹${expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}`
        ].join("\n");
        
        res.json({
          content,
          filename: `finart-expenses-${new Date().toISOString().split('T')[0]}.pdf`,
          format: "pdf"
        });
      } else {
        res.status(400).json({ error: "Invalid export format" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
