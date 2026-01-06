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
  insertLoanTermSchema,
  insertLoanPaymentSchema,
  insertCardDetailsSchema,
  insertInsuranceSchema,
  insertInsurancePremiumSchema
} from "@shared/schema";
import { suggestCategory, parseSmsMessage } from "./openai";
import { getPaydayForMonth, getNextPaydays, getPastPaydays } from "./salaryUtils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed default categories on startup
  await storage.seedDefaultCategories();

  // ========== Categories ==========
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
      console.error("Error fetching accounts:", error);
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
      console.error("Error fetching account:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const { cardDetails: cardData, ...accountData } = req.body;
      const validatedData = insertAccountSchema.parse(accountData);
      const account = await storage.createAccount(validatedData);
      
      // If card details provided, save them
      if (cardData && (account.type === 'credit_card' || account.type === 'debit_card')) {
        const lastFourDigits = cardData.cardNumber.slice(-4);
        await storage.createCardDetails({
          accountId: account.id,
          cardNumber: cardData.cardNumber,
          lastFourDigits,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          cardholderName: cardData.cardholderName,
          cardType: cardData.cardType,
        });
      }
      
      res.status(201).json(account);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid account data" });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      const { cardDetails: cardData, ...accountData } = req.body;
      const account = await storage.updateAccount(parseInt(req.params.id), accountData);
      if (account) {
        // Handle card details update
        if (cardData && (account.type === 'credit_card' || account.type === 'debit_card')) {
          const existingCard = await storage.getCardDetailsByAccountId(account.id);
          const lastFourDigits = cardData.cardNumber.slice(-4);
          
          if (existingCard) {
            await storage.updateCardDetails(existingCard.id, {
              cardNumber: cardData.cardNumber,
              lastFourDigits,
              expiryMonth: cardData.expiryMonth,
              expiryYear: cardData.expiryYear,
              cardholderName: cardData.cardholderName,
              cardType: cardData.cardType,
            });
          } else {
            await storage.createCardDetails({
              accountId: account.id,
              cardNumber: cardData.cardNumber,
              lastFourDigits,
              expiryMonth: cardData.expiryMonth,
              expiryYear: cardData.expiryYear,
              cardholderName: cardData.cardholderName,
              cardType: cardData.cardType,
            });
          }
        }
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
      console.error("Error fetching transactions:", error);
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
      console.error("Error fetching transaction:", error);
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

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Check if this transaction is linked to a savings contribution
      if (transaction.savingsContributionId) {
        return res.status(400).json({ 
          error: "Cannot edit savings contribution transaction",
          isSavingsContribution: true,
          message: "This transaction is part of a savings contribution and cannot be edited directly."
        });
      }

      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const updated = await storage.updateTransaction(transactionId, validatedData);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      // Check if this transaction is linked to a savings contribution
      if (transaction.savingsContributionId) {
        // Get all transactions linked to this contribution (both debit and credit)
        const allTransactions = await storage.getAllTransactions({});
        const linkedTransactions = allTransactions.filter(
          (t: any) => t.savingsContributionId === transaction.savingsContributionId
        );
        
        // Delete all linked transactions
        for (const linkedTx of linkedTransactions) {
          if (linkedTx.id !== transactionId) {
            await storage.deleteTransaction(linkedTx.id);
          }
        }
        
        // Delete the savings contribution
        const contribution = await storage.getSavingsContribution(transaction.savingsContributionId);
        if (contribution) {
          // Delete the contribution (this will also update the goal's currentAmount)
          await storage.deleteSavingsContribution(contribution.id);
        }
      }
      
      // Check if this transaction is linked to a payment occurrence
      if (transaction.paymentOccurrenceId) {
        // Update the payment occurrence status back to pending
        await storage.updatePaymentOccurrence(transaction.paymentOccurrenceId, { status: 'pending' });
      }
      
      // Delete the transaction (this will restore the account balance)
      const deleted = await storage.deleteTransaction(transactionId);
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
      const occurrenceId = parseInt(req.params.id);
      const { affectTransaction, affectAccountBalance, ...otherData } = req.body;
      
      // Get current occurrence
      const currentOccurrence = await storage.getPaymentOccurrence(occurrenceId);
      if (!currentOccurrence) {
        return res.status(404).json({ error: "Payment occurrence not found" });
      }

      // Get scheduled payment details
      const payment = await storage.getScheduledPayment(currentOccurrence.scheduledPaymentId);
      if (!payment) {
        return res.status(404).json({ error: "Scheduled payment not found" });
      }

      // Handle affectTransaction toggle change
      if (affectTransaction !== undefined && affectTransaction !== currentOccurrence.affectTransaction) {
        if (affectTransaction && currentOccurrence.status === 'paid') {
          // Create transaction when toggle is enabled
          const account = await storage.getDefaultAccount();
          if (account) {
            await storage.createTransaction({
              type: 'debit',
              amount: payment.amount,
              merchant: payment.name,
              description: `Scheduled payment: ${payment.name}`,
              categoryId: payment.categoryId || null,
              accountId: account.id,
              transactionDate: currentOccurrence.paidAt || currentOccurrence.dueDate,
              paymentOccurrenceId: occurrenceId,
            });
          }
        } else if (!affectTransaction) {
          // Delete transaction when toggle is disabled
          const transactions = await storage.getAllTransactions({});
          const matchingTransaction = transactions.find((t: any) => 
            t.paymentOccurrenceId === occurrenceId
          );
          if (matchingTransaction) {
            await storage.deleteTransaction(matchingTransaction.id);
          }
        }
      }

      // Handle affectAccountBalance toggle change
      if (affectAccountBalance !== undefined && affectAccountBalance !== currentOccurrence.affectAccountBalance) {
        const transactions = await storage.getAllTransactions({});
        const matchingTransaction = transactions.find((t: any) => 
          t.paymentOccurrenceId === occurrenceId
        );
        
        if (matchingTransaction && matchingTransaction.accountId) {
          const account = await storage.getAccount(matchingTransaction.accountId);
          if (account) {
            const amount = parseFloat(payment.amount);
            if (!affectAccountBalance) {
              // Restore balance when toggle is disabled (add back the payment amount)
              const newBalance = (parseFloat(account.balance) + amount).toString();
              await storage.updateAccount(account.id, { balance: newBalance });
            } else if (affectAccountBalance && !currentOccurrence.affectAccountBalance) {
              // Deduct balance when toggle is re-enabled
              const newBalance = (parseFloat(account.balance) - amount).toString();
              await storage.updateAccount(account.id, { balance: newBalance });
            }
          }
        }
      }

      // Update occurrence with new toggle states
      const updateData = {
        ...otherData,
        ...(affectTransaction !== undefined && { affectTransaction }),
        ...(affectAccountBalance !== undefined && { affectAccountBalance }),
      };
      
      const occurrence = await storage.updatePaymentOccurrence(occurrenceId, updateData);
      if (occurrence) {
        res.json(occurrence);
      } else {
        res.status(404).json({ error: "Payment occurrence not found" });
      }
    } catch (error) {
      console.error("Error updating payment occurrence:", error);
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
      const goalId = parseInt(req.params.goalId);
      
      // Get the goal to use its configured accounts and toggle settings
      const goal = await storage.getSavingsGoal(goalId);
      if (!goal) {
        return res.status(404).json({ error: "Savings goal not found" });
      }
      
      const validatedData = insertSavingsContributionSchema.parse({
        ...req.body,
        savingsGoalId: goalId,
        accountId: goal.accountId, // Use accountId from goal configuration
      });
      
      // Create the contribution
      const contribution = await storage.createSavingsContribution(validatedData);
      
      // Get toggle settings from goal (default to true if not set)
      const affectTransaction = goal.affectTransaction ?? true;
      const affectAccountBalance = goal.affectAccountBalance ?? true;
      
      // Handle transaction and balance updates based on toggle settings
      if (affectTransaction && goal.accountId && goal.toAccountId) {
        // When both from and to accounts are specified, create a single transfer transaction
        await storage.createTransaction({
          accountId: goal.accountId,
          toAccountId: goal.toAccountId,
          categoryId: null,
          amount: validatedData.amount,
          type: "transfer",
          description: `Contribution to ${goal.name}`,
          transactionDate: validatedData.contributedAt || new Date().toISOString(),
          savingsContributionId: contribution.id,
        });
        
        // If affectAccountBalance is false, reverse both balance changes
        if (!affectAccountBalance) {
          // Reverse from account balance change
          const fromAccount = await storage.getAccount(goal.accountId);
          if (fromAccount) {
            const currentBalance = parseFloat(fromAccount.balance);
            const contributionAmount = parseFloat(validatedData.amount);
            // Add amount back to reverse the debit
            await storage.updateAccount(goal.accountId, {
              balance: (currentBalance + contributionAmount).toString()
            });
          }
          
          // Reverse to account balance change
          const toAccount = await storage.getAccount(goal.toAccountId);
          if (toAccount) {
            const currentBalance = parseFloat(toAccount.balance);
            const contributionAmount = parseFloat(validatedData.amount);
            // Subtract amount back to reverse the credit
            await storage.updateAccount(goal.toAccountId, {
              balance: (currentBalance - contributionAmount).toString()
            });
          }
        }
      } else if (affectTransaction && goal.accountId && !goal.toAccountId) {
        // Only from account specified, create a debit transaction
        const categories = await storage.getAllCategories();
        let savingsCategory = categories.find(c => c.name === "Savings");
        
        if (!savingsCategory) {
          savingsCategory = await storage.createCategory({
            name: "Savings",
            icon: "piggy-bank",
            color: "#10b981",
            type: "expense",
          });
        }
        
        await storage.createTransaction({
          accountId: goal.accountId,
          categoryId: savingsCategory.id,
          amount: validatedData.amount,
          type: "debit",
          description: `Contribution to ${goal.name}`,
          transactionDate: validatedData.contributedAt || new Date().toISOString(),
          savingsContributionId: contribution.id,
        });
        
        // If affectAccountBalance is false, reverse the balance change
        if (!affectAccountBalance) {
          const account = await storage.getAccount(goal.accountId);
          if (account) {
            const currentBalance = parseFloat(account.balance);
            const contributionAmount = parseFloat(validatedData.amount);
            // Add amount back to reverse the debit
            await storage.updateAccount(goal.accountId, {
              balance: (currentBalance + contributionAmount).toString()
            });
          }
        }
      } else if (affectTransaction && !goal.accountId && goal.toAccountId) {
        // Only to account specified, create a credit transaction
        const categories = await storage.getAllCategories();
        let savingsCategory = categories.find(c => c.name === "Savings");
        
        if (!savingsCategory) {
          savingsCategory = await storage.createCategory({
            name: "Savings",
            icon: "piggy-bank",
            color: "#10b981",
            type: "income",
          });
        }
        
        await storage.createTransaction({
          accountId: goal.toAccountId,
          categoryId: savingsCategory.id,
          amount: validatedData.amount,
          type: "credit",
          description: `Contribution to ${goal.name}`,
          transactionDate: validatedData.contributedAt || new Date().toISOString(),
          savingsContributionId: contribution.id,
        });
        
        // If affectAccountBalance is false, reverse the balance change
        if (!affectAccountBalance) {
          const account = await storage.getAccount(goal.toAccountId);
          if (account) {
            const currentBalance = parseFloat(account.balance);
            const contributionAmount = parseFloat(validatedData.amount);
            // Subtract amount back to reverse the credit
            await storage.updateAccount(goal.toAccountId, {
              balance: (currentBalance - contributionAmount).toString()
            });
          }
        }
      } else if (!affectTransaction && affectAccountBalance) {
        // No transaction, but directly update balances
        if (goal.accountId) {
          const account = await storage.getAccount(goal.accountId);
          if (account) {
            const currentBalance = parseFloat(account.balance);
            const contributionAmount = parseFloat(validatedData.amount);
            // Subtract amount directly
            await storage.updateAccount(goal.accountId, {
              balance: (currentBalance - contributionAmount).toString()
            });
          }
        }
        
        if (goal.toAccountId) {
          const toAccount = await storage.getAccount(goal.toAccountId);
          if (toAccount) {
            const currentBalance = parseFloat(toAccount.balance);
            const contributionAmount = parseFloat(validatedData.amount);
            // Add amount directly
            await storage.updateAccount(goal.toAccountId, {
              balance: (currentBalance + contributionAmount).toString()
            });
          }
        }
      }
      
      res.status(201).json(contribution);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid contribution data" });
    }
  });

  app.delete("/api/savings-contributions/:id", async (req, res) => {
    try {
      const contributionId = parseInt(req.params.id);
      
      // Get contribution details before deleting
      const contribution = await storage.getSavingsContribution(contributionId);
      
      if (!contribution) {
        return res.status(404).json({ error: "Contribution not found" });
      }
      
      // Get the goal to access account configuration
      const goal = await storage.getSavingsGoal(contribution.savingsGoalId);
      if (!goal) {
        return res.status(404).json({ error: "Savings goal not found" });
      }
      
      // Delete transactions associated with this contribution
      const transactionDescription = `Contribution to ${goal.name}`;
      
      // Check if it's a transfer transaction (both from and to accounts)
      if (contribution.accountId && goal.toAccountId) {
        // Find and delete the single transfer transaction
        const allTransactions = await storage.getAllTransactions({});
        
        const transferTransaction = allTransactions.find((t: any) => 
          t.description === transactionDescription && 
          parseFloat(t.amount) === parseFloat(contribution.amount) &&
          t.savingsContributionId === contribution.id &&
          t.type === 'transfer' &&
          t.accountId === contribution.accountId &&
          t.toAccountId === goal.toAccountId
        );
        
        if (transferTransaction) {
          await storage.deleteTransaction(transferTransaction.id);
        }
      } else {
        // Find and delete transaction from accountId (debit or credit)
        if (contribution.accountId) {
          const fromTransactions = await storage.getAllTransactions({
            accountId: contribution.accountId,
            search: transactionDescription,
          });
          
          const fromTransaction = fromTransactions.find((t: any) => 
            t.description === transactionDescription && 
            parseFloat(t.amount) === parseFloat(contribution.amount) &&
            t.savingsContributionId === contribution.id &&
            (t.type === 'debit' || t.type === 'credit')
          );
          
          if (fromTransaction) {
            await storage.deleteTransaction(fromTransaction.id);
          }
        }
        
        // Find and delete transaction to toAccountId (credit) if it exists and accountId is not set
        if (goal.toAccountId && !contribution.accountId) {
          const toTransactions = await storage.getAllTransactions({
            accountId: goal.toAccountId,
            search: transactionDescription,
          });
          
          const toTransaction = toTransactions.find((t: any) => 
            t.description === transactionDescription && 
            parseFloat(t.amount) === parseFloat(contribution.amount) &&
            t.savingsContributionId === contribution.id &&
            t.type === 'credit'
          );
          
          if (toTransaction) {
            await storage.deleteTransaction(toTransaction.id);
          }
        }
      }
      
      // Delete the contribution (this also updates the goal's currentAmount)
      const deleted = await storage.deleteSavingsContribution(contributionId);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Contribution not found" });
      }
    } catch (error) {
      console.error("Error deleting contribution:", error);
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
      // Add userId (set to null since no auth)
      const profileData = {
        ...validatedData,
        userId: null,
      };
      const profile = await storage.createSalaryProfile(profileData);
      
      // Auto-generate past 3 months salary cycles
      const pastPaydays = getPastPaydays(
        profile.paydayRule || 'last_working_day',
        profile.fixedDay,
        profile.weekdayPreference,
        3
      );
      
      for (const payday of pastPaydays) {
        try {
          // Check if cycle already exists
          const existingCycles = await storage.getSalaryCycles(profile.id);
          const exists = existingCycles.some(c => c.month === payday.month && c.year === payday.year);
          
          if (!exists) {
            await storage.createSalaryCycle({
              salaryProfileId: profile.id,
              month: payday.month,
              year: payday.year,
              expectedPayDate: payday.date.toISOString(),
              expectedAmount: profile.monthlyAmount,
              actualPayDate: null,
              actualAmount: null,
            });
          }
        } catch (cycleError) {
          console.error('Error creating salary cycle:', cycleError);
        }
      }
      
      res.status(201).json(profile);
    } catch (error: any) {
      console.error("Salary profile creation error:", error);
      res.status(400).json({ error: error.message || "Invalid salary profile data" });
    }
  });

  app.patch("/api/salary-profile/:id", async (req, res) => {
    try {
      const profile = await storage.updateSalaryProfile(parseInt(req.params.id), req.body);
      if (profile) {
        // Auto-generate past 3 months salary cycles if they don't exist
        const pastPaydays = getPastPaydays(
          profile.paydayRule || 'last_working_day',
          profile.fixedDay,
          profile.weekdayPreference,
          3
        );
        
        for (const payday of pastPaydays) {
          try {
            const existingCycles = await storage.getSalaryCycles(profile.id);
            const exists = existingCycles.some(c => c.month === payday.month && c.year === payday.year);
            
            if (!exists) {
              await storage.createSalaryCycle({
                salaryProfileId: profile.id,
                month: payday.month,
                year: payday.year,
                expectedPayDate: payday.date.toISOString(),
                expectedAmount: profile.monthlyAmount,
                actualPayDate: null,
                actualAmount: null,
              });
            }
          } catch (cycleError) {
            console.error('Error creating salary cycle:', cycleError);
          }
        }
        
        res.json(profile);
      } else {
        res.status(404).json({ error: "Salary profile not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update salary profile" });
    }
  });

  app.get("/api/salary-profile/next-paydays", async (req, res) => {
    try {
      const profile = await storage.getSalaryProfile();
      if (!profile) {
        res.json([]);
        return;
      }
      const count = req.query.count ? parseInt(req.query.count as string) : 6;
      const paydays = getNextPaydays(
        profile.paydayRule || 'last_working_day',
        profile.fixedDay,
        profile.weekdayPreference,
        count
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
      const cycleId = parseInt(req.params.id);
      const { markAsCredited, ...updateData } = req.body;
      
      // Get current cycle to check existing state
      const currentCycle = await storage.getSalaryCycle(cycleId);
      if (!currentCycle) {
        res.status(404).json({ error: "Salary cycle not found" });
        return;
      }

      // Get salary profile to get account info
      const profile = await storage.getSalaryProfile();
      if (!profile || !profile.accountId) {
        res.status(400).json({ error: "Salary profile or account not configured" });
        return;
      }

      // Handle marking as credited/uncredited
      if (markAsCredited !== undefined) {
        if (markAsCredited && !currentCycle.transactionId) {
          // Create transaction
          if (!updateData.actualAmount || !updateData.actualPayDate) {
            res.status(400).json({ error: "Actual amount and date required to mark as credited" });
            return;
          }

          // Get or create Salary category
          let salaryCategory = await storage.getCategoryByName('Salary');
          if (!salaryCategory) {
            salaryCategory = await storage.createCategory({
              name: 'Salary',
              type: 'income',
              icon: 'wallet',
              color: '#10b981',
            });
          }

          // Create transaction
          const transaction = await storage.createTransaction({
            accountId: profile.accountId,
            categoryId: salaryCategory.id,
            type: 'credit',
            amount: updateData.actualAmount,
            transactionDate: new Date(updateData.actualPayDate),
            description: `Salary - ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentCycle.month - 1]} ${currentCycle.year}`,
          });

          // createTransaction already updates account balance automatically
          
          // Update cycle with transaction ID
          updateData.transactionId = transaction.id;
        } else if (!markAsCredited && currentCycle.transactionId) {
          // Delete transaction (this will automatically update account balance)
          await storage.deleteTransaction(currentCycle.transactionId);
          updateData.transactionId = null;
        }
      }

      // Update the cycle
      const cycle = await storage.updateSalaryCycle(cycleId, updateData);
      if (cycle) {
        res.json(cycle);
      } else {
        res.status(404).json({ error: "Salary cycle not found" });
      }
    } catch (error: any) {
      console.error("Error updating salary cycle:", error);
      res.status(500).json({ error: error.message || "Failed to update salary cycle" });
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
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Get credit card billing cycle spending
  app.get("/api/credit-card-spending", async (_req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      const creditCards = accounts.filter(acc => acc.type === 'credit_card' && acc.isActive && acc.billingDate);
      
      const cardSpending = [];
      
      for (const card of creditCards) {
        const now = new Date();
        const currentDay = now.getDate();
        const billingDay = card.billingDate!;
        
        // Determine billing cycle dates
        let cycleStartDate: Date;
        let cycleEndDate: Date;
        
        if (currentDay >= billingDay) {
          // Current cycle: billingDay of this month to today
          cycleStartDate = new Date(now.getFullYear(), now.getMonth(), billingDay, 0, 0, 0);
          cycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay - 1, 23, 59, 59);
        } else {
          // Previous cycle: billingDay of last month to today
          cycleStartDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay, 0, 0, 0);
          cycleEndDate = new Date(now.getFullYear(), now.getMonth(), billingDay - 1, 23, 59, 59);
        }
        
        // Get transactions for this card in billing cycle
        const transactions = await storage.getAllTransactions({
          accountId: card.id,
          startDate: cycleStartDate,
          endDate: cycleEndDate,
        });
        
        const totalSpent = transactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const creditLimit = card.creditLimit ? parseFloat(card.creditLimit) : 0;
        const availableCredit = parseFloat(card.balance);
        const usedCredit = creditLimit - availableCredit;
        
        cardSpending.push({
          accountId: card.id,
          accountName: card.name,
          color: card.color,
          billingDate: billingDay,
          cycleStart: cycleStartDate.toISOString(),
          cycleEnd: cycleEndDate.toISOString(),
          totalSpent,
          creditLimit,
          availableCredit,
          usedCredit,
          utilizationPercent: creditLimit > 0 ? (totalSpent / creditLimit) * 100 : 0,
        });
      }
      
      res.json(cardSpending);
    } catch (error) {
      console.error("Error fetching credit card spending:", error);
      res.status(500).json({ error: "Failed to fetch credit card spending" });
    }
  });

  // ========== Expense Analytics ==========
  app.get("/api/expenses/monthly", async (_req, res) => {
    try {
      const now = new Date();
      const monthlyData = [];
      
      // Get last 6 months of expense data
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        
        const transactions = await storage.getAllTransactions({
          startDate: startOfMonth,
          endDate: endOfMonth,
        });
        
        const totalExpenses = transactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthlyData.push({
          month: monthNames[month],
          year,
          fullMonth: `${monthNames[month]} ${year}`,
          expenses: totalExpenses,
          monthIndex: month,
        });
      }
      
      res.json(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly expenses:", error);
      res.status(500).json({ error: "Failed to fetch monthly expenses" });
    }
  });

  // Get credit card spending trend
  app.get("/api/credit-card-spending/monthly", async (_req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      const creditCards = accounts.filter(acc => acc.type === 'credit_card' && acc.isActive);
      
      if (creditCards.length === 0) {
        return res.json([]);
      }
      
      const now = new Date();
      const monthlyData = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Get last 6 months of credit card spending data
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        
        let totalSpending = 0;
        
        // Sum spending across all credit cards
        for (const card of creditCards) {
          const transactions = await storage.getAllTransactions({
            accountId: card.id,
            startDate: startOfMonth,
            endDate: endOfMonth,
          });
          
          const cardSpending = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
          
          totalSpending += cardSpending;
        }
        
        monthlyData.push({
          month: monthNames[month],
          year,
          fullMonth: `${monthNames[month]} ${year}`,
          spending: totalSpending,
          monthIndex: month,
        });
      }
      
      res.json(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly credit card spending:", error);
      res.status(500).json({ error: "Failed to fetch monthly credit card spending" });
    }
  });

  app.get("/api/expenses/category-breakdown", async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }
      
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      
      const startOfMonth = new Date(yearNum, monthNum, 1);
      const endOfMonth = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);
      
      const transactions = await storage.getAllTransactions({
        startDate: startOfMonth,
        endDate: endOfMonth,
      });
      
      const categoryTotals = new Map<number, { name: string; total: number; color: string; count: number }>();
      
      for (const t of transactions.filter(t => t.type === 'debit')) {
        if (t.categoryId && t.category) {
          const existing = categoryTotals.get(t.categoryId) || { 
            name: t.category.name, 
            total: 0, 
            color: t.category.color || '#9E9E9E',
            count: 0
          };
          existing.total += parseFloat(t.amount);
          existing.count += 1;
          categoryTotals.set(t.categoryId, existing);
        }
      }
      
      const breakdown = Array.from(categoryTotals.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        total: data.total,
        color: data.color,
        transactionCount: data.count,
      })).sort((a, b) => b.total - a.total);
      
      const totalExpenses = breakdown.reduce((sum, item) => sum + item.total, 0);
      
      res.json({
        month: monthNum,
        year: yearNum,
        totalExpenses,
        breakdown,
      });
    } catch (error) {
      console.error("Error fetching category breakdown:", error);
      res.status(500).json({ error: "Failed to fetch category breakdown" });
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

  app.post("/api/loans/:id/generate-installments", async (req, res) => {
    try {
      const installments = await storage.generateLoanInstallments(parseInt(req.params.id));
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate installments" });
    }
  });

  app.get("/api/loans/:id/details", async (req, res) => {
    try {
      const loan = await storage.getLoan(parseInt(req.params.id));
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }
      const [terms, installments, payments] = await Promise.all([
        storage.getLoanTerms(loan.id),
        storage.getLoanInstallments(loan.id),
        storage.getLoanPayments(loan.id)
      ]);
      res.json({ ...loan, terms, installments, payments });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan details" });
    }
  });

  app.get("/api/loans/:loanId/installments", async (req, res) => {
    try {
      const installments = await storage.getLoanInstallments(parseInt(req.params.loanId));
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch installments" });
    }
  });

  app.patch("/api/loans/:loanId/installments/:id", async (req, res) => {
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

  app.post("/api/loans/:loanId/installments/:id/pay", async (req, res) => {
    try {
      const { paidDate, paidAmount, accountId, notes } = req.body;
      const loanId = parseInt(req.params.loanId);
      const installmentId = parseInt(req.params.id);
      
      const payment = await storage.createLoanPayment({
        loanId,
        installmentId,
        paymentDate: new Date(paidDate),
        amount: paidAmount,
        paymentType: 'emi',
        accountId: accountId || null,
        notes: notes || null
      });
      
      const installment = await storage.getLoanInstallment(installmentId);
      res.json(installment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to mark installment paid" });
    }
  });

  app.get("/api/loans/:loanId/terms", async (req, res) => {
    try {
      const terms = await storage.getLoanTerms(parseInt(req.params.loanId));
      res.json(terms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan terms" });
    }
  });

  app.post("/api/loans/:loanId/terms", async (req, res) => {
    try {
      const validatedData = insertLoanTermSchema.parse({
        ...req.body,
        loanId: parseInt(req.params.loanId),
        effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date(),
        effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : null
      });
      const term = await storage.createLoanTerm(validatedData);
      res.status(201).json(term);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid term data" });
    }
  });

  app.get("/api/loans/:loanId/payments", async (req, res) => {
    try {
      const payments = await storage.getLoanPayments(parseInt(req.params.loanId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan payments" });
    }
  });

  app.post("/api/loans/:loanId/payments", async (req, res) => {
    try {
      const validatedData = insertLoanPaymentSchema.parse({
        ...req.body,
        loanId: parseInt(req.params.loanId),
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date()
      });
      const payment = await storage.createLoanPayment(validatedData);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.patch("/api/loan-payments/:id", async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined
      };
      const payment = await storage.updateLoanPayment(parseInt(req.params.id), updateData);
      if (payment) {
        res.json(payment);
      } else {
        res.status(404).json({ error: "Payment not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.delete("/api/loan-payments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLoanPayment(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Payment not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
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

  // ========== Insurance ==========
  app.get("/api/insurances", async (_req, res) => {
    try {
      const insurances = await storage.getAllInsurances();
      res.json(insurances);
    } catch (error) {
      console.error("Error fetching insurances:", error);
      res.status(500).json({ error: "Failed to fetch insurances" });
    }
  });

  app.get("/api/insurances/:id", async (req, res) => {
    try {
      const insurance = await storage.getInsurance(parseInt(req.params.id));
      if (insurance) {
        res.json(insurance);
      } else {
        res.status(404).json({ error: "Insurance not found" });
      }
    } catch (error) {
      console.error("Error fetching insurance:", error);
      res.status(500).json({ error: "Failed to fetch insurance" });
    }
  });

  app.post("/api/insurances", async (req, res) => {
    try {
      const validatedData = insertInsuranceSchema.parse(req.body);
      const insurance = await storage.createInsurance(validatedData);
      
      // Auto-generate premium terms
      if (insurance.id) {
        await storage.generateInsurancePremiums(insurance.id);
      }
      
      // Return with premiums
      const fullInsurance = await storage.getInsurance(insurance.id);
      res.status(201).json(fullInsurance);
    } catch (error: any) {
      console.error("Error creating insurance:", error);
      res.status(400).json({ error: error.message || "Invalid insurance data" });
    }
  });

  app.patch("/api/insurances/:id", async (req, res) => {
    try {
      const validatedData = insertInsuranceSchema.partial().parse(req.body);
      const insurance = await storage.updateInsurance(parseInt(req.params.id), validatedData);
      if (insurance) {
        // If premium-related fields changed, regenerate premiums
        if (req.body.premiumAmount || req.body.termsPerPeriod || req.body.premiumFrequency || req.body.startDate || req.body.endDate) {
          await storage.generateInsurancePremiums(insurance.id);
        }
        const fullInsurance = await storage.getInsurance(insurance.id);
        res.json(fullInsurance);
      } else {
        res.status(404).json({ error: "Insurance not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid insurance data" });
    }
  });

  app.delete("/api/insurances/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInsurance(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Insurance not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete insurance" });
    }
  });

  // ========== Insurance Premiums ==========
  app.get("/api/insurances/:insuranceId/premiums", async (req, res) => {
    try {
      const premiums = await storage.getInsurancePremiums(parseInt(req.params.insuranceId));
      res.json(premiums);
    } catch (error) {
      console.error("Error fetching premiums:", error);
      res.status(500).json({ error: "Failed to fetch premiums" });
    }
  });

  app.post("/api/insurances/:insuranceId/premiums", async (req, res) => {
    try {
      const validatedData = insertInsurancePremiumSchema.parse({
        ...req.body,
        insuranceId: parseInt(req.params.insuranceId)
      });
      const premium = await storage.createInsurancePremium(validatedData);
      res.status(201).json(premium);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid premium data" });
    }
  });

  app.patch("/api/insurances/:insuranceId/premiums/:id", async (req, res) => {
    try {
      const premium = await storage.updateInsurancePremium(parseInt(req.params.id), req.body);
      if (premium) {
        res.json(premium);
      } else {
        res.status(404).json({ error: "Premium not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid premium data" });
    }
  });

  app.post("/api/insurances/:insuranceId/premiums/:id/pay", async (req, res) => {
    try {
      const { amount, accountId, createTransaction: shouldCreateTransaction } = req.body;
      const premiumId = parseInt(req.params.id);
      const insuranceId = parseInt(req.params.insuranceId);
      
      let transactionId: number | undefined;
      
      // Create transaction if requested
      if (shouldCreateTransaction) {
        const insurance = await storage.getInsurance(insuranceId);
        if (insurance) {
          // Get or create insurance category
          let category = await storage.getCategoryByName("Insurance");
          if (!category) {
            category = await storage.createCategory({
              name: "Insurance",
              icon: "shield",
              color: "#6366f1",
              type: "expense"
            });
          }
          
          const transaction = await storage.createTransaction({
            accountId: accountId || insurance.accountId,
            categoryId: category.id,
            amount,
            type: "debit",
            description: `Insurance Premium - ${insurance.name}`,
            merchant: insurance.providerName || insurance.name,
            transactionDate: new Date()
          });
          transactionId = transaction.id;
        }
      }
      
      const premium = await storage.markPremiumPaid(premiumId, amount, accountId, transactionId);
      if (premium) {
        res.json(premium);
      } else {
        res.status(404).json({ error: "Premium not found" });
      }
    } catch (error: any) {
      console.error("Error marking premium as paid:", error);
      res.status(400).json({ error: error.message || "Failed to mark premium as paid" });
    }
  });

  app.delete("/api/insurances/:insuranceId/premiums/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInsurancePremium(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Premium not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete premium" });
    }
  });

  // Regenerate premiums for an insurance
  app.post("/api/insurances/:id/regenerate-premiums", async (req, res) => {
    try {
      const premiums = await storage.generateInsurancePremiums(parseInt(req.params.id));
      res.json(premiums);
    } catch (error) {
      console.error("Error regenerating premiums:", error);
      res.status(500).json({ error: "Failed to regenerate premiums" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
