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
import { suggestCategory, parseSmsMessage, fallbackCategorization } from "./openai";
import { getPaydayForMonth, getNextPaydays, getPastPaydays } from "./salaryUtils";
import { generateOTP, storeOTP, verifyOTP, sendOTP } from "./emailService";
import { generateTokenPair, generateAccessToken } from "./jwtService";
import { authenticateToken } from "./authMiddleware";
import { verifyToken } from "./jwtService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed default categories on startup
  await storage.seedDefaultCategories();

  // ========== Authentication ==========
  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { email, username } = req.body;
      
      if (!email || !username) {
        return res.status(400).json({ error: "Email and username are required" });
      }

      // Check if user exists, if not create
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          name: username,
          email: email,
        });
      }

      // Generate and store OTP
      const otp = generateOTP();
      storeOTP(email, otp);

      // Send OTP via email
      const sent = await sendOTP(email, username, otp);
      
      if (sent) {
        res.json({ success: true, message: "OTP sent to your email" });
      } else {
        res.status(500).json({ error: "Failed to send OTP" });
      }
    } catch (error: any) {
      console.error("Request OTP error:", error);
      res.status(500).json({ error: error.message || "Failed to request OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
      }

      const isValid = verifyOTP(email, otp);
      
      if (isValid) {
        const user = await storage.getUserByEmail(email);
        if (user) {
          // Generate JWT token pair
          const { accessToken, refreshToken } = generateTokenPair(user.id, user.email!);
          
          res.json({ 
            success: true,
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              hasPassword: !!user.passwordHash,
              hasPin: !!user.pinHash,
              biometricEnabled: user.biometricEnabled
            }
          });
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } else {
        res.status(401).json({ error: "Invalid or expired OTP" });
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: error.message || "Failed to verify OTP" });
    }
  });

  // Password-based login
  app.post("/api/auth/login-password", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (isValidPassword) {
        const { accessToken, refreshToken } = generateTokenPair(user.id, user.email!);
        
        res.json({ 
          success: true,
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            hasPassword: !!user.passwordHash,
            hasPin: !!user.pinHash,
            biometricEnabled: user.biometricEnabled
          }
        });
      } else {
        res.status(401).json({ error: "Invalid email or password" });
      }
    } catch (error: any) {
      console.error("Password login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  // Set password (after first OTP login)
  app.post("/api/auth/set-password", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // First check if user exists
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        console.error(`❌ [set-password] User not found with ID: ${userId}`);
        console.error(`   Token payload:`, req.user);
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`✅ [set-password] Setting password for user: ${existingUser.email} (ID: ${userId})`);

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.updateUser(userId, { passwordHash });
      
      if (user) {
        console.log(`✅ [set-password] Password set successfully for user: ${user.email}`);
        res.json({ 
          success: true, 
          message: "Password set successfully",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            hasPassword: !!user.passwordHash,
            hasPin: !!user.pinHash,
            biometricEnabled: user.biometricEnabled
          }
        });
      } else {
        console.error(`❌ [set-password] Failed to update password for user ID: ${userId}`);
        res.status(500).json({ error: "Failed to update password" });
      }
    } catch (error: any) {
      console.error("❌ [set-password] Error:", error);
      res.status(500).json({ error: error.message || "Failed to set password" });
    }
  });

  app.post("/api/auth/setup-pin", async (req, res) => {
    try {
      const { userId, pin } = req.body;
      
      if (!userId || !pin) {
        return res.status(400).json({ error: "User ID and PIN are required" });
      }

      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be 4 digits" });
      }

      const pinHash = await bcrypt.hash(pin, 10);
      const user = await storage.updateUserPin(userId, pinHash);
      
      if (user) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error: any) {
      console.error("Setup PIN error:", error);
      res.status(500).json({ error: error.message || "Failed to setup PIN" });
    }
  });

  app.post("/api/auth/verify-pin", async (req, res) => {
    try {
      const { userId, pin } = req.body;
      
      if (!userId || !pin) {
        return res.status(400).json({ error: "User ID and PIN are required" });
      }

      const user = await storage.getUser(userId);
      
      if (!user || !user.pinHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(pin, user.pinHash);
      
      if (isValid) {
        // Generate JWT token pair
        const { accessToken, refreshToken } = generateTokenPair(user.id, user.email!);
        
        res.json({ 
          success: true, 
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            biometricEnabled: user.biometricEnabled
          }
        });
      } else {
        res.status(401).json({ error: "Invalid PIN" });
      }
    } catch (error: any) {
      console.error("Verify PIN error:", error);
      res.status(500).json({ error: error.message || "Failed to verify PIN" });
    }
  });

  // Biometric verification endpoint - verifies user has biometric enabled and returns tokens
  app.post("/api/auth/verify-biometric", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (!user.biometricEnabled) {
        return res.status(403).json({ error: "Biometric authentication not enabled" });
      }

      // Since the device already verified biometric (fingerprint/face), 
      // we trust that and generate tokens
      const { accessToken, refreshToken } = generateTokenPair(user.id, user.email!);
      
      res.json({ 
        success: true, 
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          biometricEnabled: user.biometricEnabled
        }
      });
    } catch (error: any) {
      console.error("Verify biometric error:", error);
      res.status(500).json({ error: error.message || "Failed to verify biometric" });
    }
  });

  app.post("/api/auth/toggle-biometric", async (req, res) => {
    try {
      const { userId, enabled } = req.body;
      
      if (!userId || enabled === undefined) {
        return res.status(400).json({ error: "User ID and enabled status are required" });
      }

      const user = await storage.updateUserBiometric(userId, enabled);
      
      if (user) {
        res.json({ success: true, biometricEnabled: user.biometricEnabled });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error: any) {
      console.error("Toggle biometric error:", error);
      res.status(500).json({ error: error.message || "Failed to toggle biometric" });
    }
  });

  // Refresh access token using refresh token
  app.post("/api/auth/refresh-token", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      // Verify refresh token
      const payload = verifyToken(refreshToken);
      
      if (!payload || payload.type !== 'refresh') {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(payload.userId, payload.email);
      
      res.json({ 
        success: true,
        accessToken: newAccessToken
      });
    } catch (error: any) {
      console.error("Refresh token error:", error);
      res.status(403).json({ error: "Invalid or expired refresh token" });
    }
  });

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

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid category data" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to delete category" });
    }
  });

  app.get("/api/categories/usage", async (_req, res) => {
    try {
      const usage = await storage.getCategoryUsage();
      res.json(usage);
    } catch (error) {
      console.error("Error fetching category usage:", error);
      res.status(500).json({ error: "Failed to fetch category usage" });
    }
  });

  // ========== Accounts ==========
  app.get("/api/accounts", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const accounts = await storage.getAllAccounts(userId);
      // Optimize: Batch fetch card details for all card accounts at once
      const cardAccountIds = accounts
        .filter(a => a.type === 'credit_card' || a.type === 'debit_card')
        .map(a => a.id);
      
      const cardDetailsMap = new Map();
      if (cardAccountIds.length > 0) {
        const allCardDetails = await Promise.all(
          cardAccountIds.map(id => storage.getCardDetails(id))
        );
        cardAccountIds.forEach((id, idx) => {
          if (allCardDetails[idx]) cardDetailsMap.set(id, allCardDetails[idx]);
        });
      }
      
      const accountsWithCards = accounts.map(account => {
        if (cardDetailsMap.has(account.id)) {
          return { ...account, cardDetails: cardDetailsMap.get(account.id) };
        }
        return account;
      });
      
      res.json(accountsWithCards);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const account = await storage.getAccount(parseInt(req.params.id));
      if (account && account.userId === userId) {
        res.json(account);
      } else {
        res.status(404).json({ error: "Account not found" });
      }
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { cardDetails: cardData, ...accountData } = req.body;
      const validatedData = insertAccountSchema.parse({ ...accountData, userId });
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

  app.patch("/api/accounts/:id", authenticateToken, async (req, res) => {
    try {
      const { cardDetails: cardData, ...accountData } = req.body;
      const account = await storage.updateAccount(parseInt(req.params.id), accountData);
      if (account) {
        // Handle card details update
        if (cardData && (account.type === 'credit_card' || account.type === 'debit_card')) {
          const existingCard = await storage.getCardDetails(account.id);
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

  app.delete("/api/accounts/:id", authenticateToken, async (req, res) => {
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
  app.get("/api/transactions", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { accountId, categoryId, startDate, endDate, search, limit } = req.query;
      
      const filters: any = { userId };
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

  app.get("/api/transactions/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (transaction && transaction.userId === userId) {
        res.json(transaction);
      } else {
        res.status(404).json({ error: "Transaction not found" });
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      console.log("🔍 [transactions] POST Request Debug:");
      console.log("  User ID:", userId);
      console.log("  Raw request body:", JSON.stringify(req.body, null, 2));
      
      const transactionData = { ...req.body, userId };
      console.log("  Transaction data with userId:", JSON.stringify(transactionData, null, 2));
      
      const validatedData = insertTransactionSchema.parse(transactionData);
      console.log("  ✅ Validation passed, creating transaction...");
      
      const transaction = await storage.createTransaction(validatedData);
      console.log("  ✅ Transaction created successfully:", transaction.id);
      
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error("❌ [transactions] POST Error:");
      console.error("  Error type:", error.constructor.name);
      console.error("  Error message:", error.message);
      
      if (error.name === 'ZodError') {
        console.error("  🔴 Zod Validation Errors:");
        error.issues?.forEach((issue: any, index: number) => {
          console.error(`    ${index + 1}. Path: ${issue.path.join('.')}`);
          console.error(`       Code: ${issue.code}`);
          console.error(`       Message: ${issue.message}`);
          if (issue.received !== undefined) {
            console.error(`       Received: ${JSON.stringify(issue.received)}`);
          }
          if (issue.expected !== undefined) {
            console.error(`       Expected: ${issue.expected}`);
          }
        });
        
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
            received: issue.received,
            expected: issue.expected
          }))
        });
      }
      
      console.error("  Full error:", error);
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.patch("/api/transactions/:id", authenticateToken, async (req, res) => {
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

  app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
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
      
      // If this transaction was created from SMS, clear the transactionId reference in the SMS log
      if (transaction.smsId) {
        await storage.clearSmsLogTransaction(transaction.smsId);
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
  app.get("/api/budgets", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { month, year } = req.query;
      const filters: any = { userId };
      if (month) filters.month = parseInt(month as string);
      if (year) filters.year = parseInt(year as string);

      const budgets = await storage.getAllBudgets(filters);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      console.log("🔍 [budgets] POST Request Debug:");
      console.log("  User ID:", userId);
      console.log("  Raw request body:", JSON.stringify(req.body, null, 2));
      
      const budgetData = { ...req.body, userId };
      console.log("  Budget data with userId:", JSON.stringify(budgetData, null, 2));
      
      const validatedData = insertBudgetSchema.parse(budgetData);
      console.log("  ✅ Validation passed, creating budget...");
      
      const budget = await storage.createBudget(validatedData);
      console.log("  ✅ Budget created successfully:", budget.id);
      
      res.status(201).json(budget);
    } catch (error: any) {
      console.error("❌ [budgets] POST Error:");
      console.error("  Error type:", error.constructor.name);
      console.error("  Error message:", error.message);
      
      if (error.name === 'ZodError') {
        console.error("  🔴 Zod Validation Errors:");
        error.issues?.forEach((issue: any, index: number) => {
          console.error(`    ${index + 1}. Path: ${issue.path.join('.')}`);
          console.error(`       Code: ${issue.code}`);
          console.error(`       Message: ${issue.message}`);
          if (issue.received !== undefined) {
            console.error(`       Received: ${JSON.stringify(issue.received)}`);
          }
          if (issue.expected !== undefined) {
            console.error(`       Expected: ${issue.expected}`);
          }
        });
        
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
            received: issue.received,
            expected: issue.expected
          }))
        });
      }
      
      console.error("  Full error:", error);
      res.status(400).json({ error: error.message || "Invalid budget data" });
    }
  });

  app.patch("/api/budgets/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const budgetId = parseInt(req.params.id);
      
      // First verify the budget belongs to the user
      const existingBudget = await storage.getBudget(budgetId);
      if (!existingBudget || existingBudget.userId !== userId) {
        return res.status(404).json({ error: "Budget not found" });
      }
      
      const budget = await storage.updateBudget(budgetId, req.body);
      if (budget) {
        res.json(budget);
      } else {
        res.status(404).json({ error: "Budget not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid budget data" });
    }
  });

  app.delete("/api/budgets/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const budgetId = parseInt(req.params.id);
      
      // First verify the budget belongs to the user
      const existingBudget = await storage.getBudget(budgetId);
      if (!existingBudget || existingBudget.userId !== userId) {
        return res.status(404).json({ error: "Budget not found" });
      }
      
      const deleted = await storage.deleteBudget(budgetId);
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
  app.get("/api/scheduled-payments", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const payments = await storage.getAllScheduledPayments(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled payments" });
    }
  });

  app.get("/api/scheduled-payments/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const payment = await storage.getScheduledPayment(parseInt(req.params.id));
      if (payment && payment.userId === userId) {
        res.json(payment);
      } else {
        res.status(404).json({ error: "Scheduled payment not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled payment" });
    }
  });

  app.post("/api/scheduled-payments", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      console.log("🔍 [scheduled-payments] POST Request Debug:");
      console.log("  User ID:", userId);
      console.log("  Raw request body:", JSON.stringify(req.body, null, 2));
      
      const paymentData = { ...req.body, userId };
      console.log("  Payment data with userId:", JSON.stringify(paymentData, null, 2));
      
      const validatedData = insertScheduledPaymentSchema.parse(paymentData);
      console.log("  ✅ Validation passed, creating scheduled payment...");
      
      const payment = await storage.createScheduledPayment(validatedData);
      console.log("  ✅ Scheduled payment created successfully:", payment.id);
      
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("❌ [scheduled-payments] POST Error:");
      console.error("  Error type:", error.constructor.name);
      console.error("  Error message:", error.message);
      
      if (error.name === 'ZodError') {
        console.error("  🔴 Zod Validation Errors:");
        error.issues?.forEach((issue: any, index: number) => {
          console.error(`    ${index + 1}. Path: ${issue.path.join('.')}`);
          console.error(`       Code: ${issue.code}`);
          console.error(`       Message: ${issue.message}`);
          if (issue.received !== undefined) {
            console.error(`       Received: ${JSON.stringify(issue.received)}`);
          }
          if (issue.expected !== undefined) {
            console.error(`       Expected: ${issue.expected}`);
          }
        });
        
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
            received: issue.received,
            expected: issue.expected
          }))
        });
      }
      
      console.error("  Full error:", error);
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.patch("/api/scheduled-payments/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const paymentId = parseInt(req.params.id);
      
      // First verify the payment belongs to the user
      const existingPayment = await storage.getScheduledPayment(paymentId);
      if (!existingPayment || existingPayment.userId !== userId) {
        return res.status(404).json({ error: "Scheduled payment not found" });
      }
      
      const payment = await storage.updateScheduledPayment(paymentId, req.body);
      if (payment) {
        res.json(payment);
      } else {
        res.status(404).json({ error: "Scheduled payment not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.delete("/api/scheduled-payments/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const paymentId = parseInt(req.params.id);
      
      // First verify the payment belongs to the user
      const existingPayment = await storage.getScheduledPayment(paymentId);
      if (!existingPayment || existingPayment.userId !== userId) {
        return res.status(404).json({ error: "Scheduled payment not found" });
      }
      
      const deleted = await storage.deleteScheduledPayment(paymentId);
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
  app.get("/api/payment-occurrences", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { month, year } = req.query;
      const filters: any = { userId };
      if (month) filters.month = parseInt(month as string);
      if (year) filters.year = parseInt(year as string);

      const occurrences = await storage.getPaymentOccurrences(filters);
      res.json(occurrences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment occurrences" });
    }
  });

  // ========== Credit Card Bills ==========
  app.get("/api/credit-card-bills", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const bills = await storage.getCreditCardBills();
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credit card bills" });
    }
  });

  // ========== Credit Card Statements ==========
  app.get("/api/credit-card-statements/:accountId", authenticateToken, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const statements = await storage.getCreditCardStatements(accountId);
      res.json(statements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credit card statements" });
    }
  });

  app.get("/api/credit-card-statement/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const statement = await storage.getCreditCardStatement(id);
      if (statement) {
        res.json(statement);
      } else {
        res.status(404).json({ error: "Statement not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statement" });
    }
  });

  app.post("/api/credit-card-statements/:accountId/current", authenticateToken, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const statement = await storage.getOrCreateCurrentStatement(accountId);
      res.json(statement);
    } catch (error) {
      res.status(500).json({ error: "Failed to get/create statement" });
    }
  });

  app.post("/api/credit-card-statements/:id/payment", authenticateToken, async (req, res) => {
    try {
      const statementId = parseInt(req.params.id);
      const { amount, paidDate } = req.body;
      
      if (!amount || amount <= 0) {
        res.status(400).json({ error: "Valid payment amount is required" });
        return;
      }

      const statement = await storage.recordCreditCardPayment(
        statementId, 
        parseFloat(amount), 
        paidDate ? new Date(paidDate) : new Date()
      );

      if (statement) {
        res.json(statement);
      } else {
        res.status(404).json({ error: "Statement not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  app.post("/api/payment-occurrences/generate", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { month, year } = req.body;
      if (!month || !year) {
        res.status(400).json({ error: "Month and year are required" });
        return;
      }
      const occurrences = await storage.generatePaymentOccurrencesForMonth(month, year, userId);
      res.json(occurrences);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate payment occurrences" });
    }
  });

  app.patch("/api/payment-occurrences/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const occurrenceId = parseInt(req.params.id);
      const { affectTransaction, affectAccountBalance, ...otherData } = req.body;
      
      // Get current occurrence and verify user ownership
      const currentOccurrence = await storage.getPaymentOccurrence(occurrenceId);
      if (!currentOccurrence) {
        return res.status(404).json({ error: "Payment occurrence not found" });
      }

      // Get scheduled payment details and verify user ownership
      const payment = await storage.getScheduledPayment(currentOccurrence.scheduledPaymentId);
      if (!payment || payment.userId !== userId) {
        return res.status(404).json({ error: "Scheduled payment not found" });
      }

      // Handle affectTransaction toggle change
      if (affectTransaction !== undefined && affectTransaction !== currentOccurrence.affectTransaction) {
        if (affectTransaction && currentOccurrence.status === 'paid') {
          // Create transaction when toggle is enabled
          const account = await storage.getDefaultAccount();
          if (account && payment.amount) {
            await storage.createTransaction({
              userId: userId,
              type: 'debit',
              amount: payment.amount,
              merchant: payment.name,
              description: `Scheduled payment: ${payment.name}`,
              categoryId: payment.categoryId || null,
              accountId: account.id,
              transactionDate: (currentOccurrence.paidAt || currentOccurrence.dueDate).toISOString(),
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
        
        if (matchingTransaction && matchingTransaction.accountId && payment.amount) {
          const account = await storage.getAccount(matchingTransaction.accountId);
          if (account) {
            const amount = parseFloat(payment.amount);
            if (!affectAccountBalance) {
              // Restore balance when toggle is disabled (add back the payment amount)
              const newBalance = (parseFloat(account.balance || '0') + amount).toString();
              await storage.updateAccount(account.id, { balance: newBalance });
            } else if (affectAccountBalance && !currentOccurrence.affectAccountBalance) {
              // Deduct balance when toggle is re-enabled
              const newBalance = (parseFloat(account.balance || '0') - amount).toString();
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
  app.get("/api/savings-goals", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const goals = await storage.getAllSavingsGoals(userId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch savings goals" });
    }
  });

  app.get("/api/savings-goals/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const goal = await storage.getSavingsGoal(parseInt(req.params.id));
      if (goal && goal.userId === userId) {
        res.json(goal);
      } else {
        res.status(404).json({ error: "Savings goal not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch savings goal" });
    }
  });

  app.post("/api/savings-goals", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      console.log("🔍 [savings-goals] POST Request Debug:");
      console.log("  User ID:", userId);
      console.log("  Raw request body:", JSON.stringify(req.body, null, 2));
      
      const goalData = { ...req.body, userId };
      console.log("  Goal data with userId:", JSON.stringify(goalData, null, 2));
      
      const validatedData = insertSavingsGoalSchema.parse(goalData);
      console.log("  ✅ Validation passed, creating savings goal...");
      
      const goal = await storage.createSavingsGoal(validatedData);
      console.log("  ✅ Savings goal created successfully:", goal.id);
      
      res.status(201).json(goal);
    } catch (error: any) {
      console.error("❌ [savings-goals] POST Error:");
      console.error("  Error type:", error.constructor.name);
      console.error("  Error message:", error.message);
      
      if (error.name === 'ZodError') {
        console.error("  🔴 Zod Validation Errors:");
        error.issues?.forEach((issue: any, index: number) => {
          console.error(`    ${index + 1}. Path: ${issue.path.join('.')}`);
          console.error(`       Code: ${issue.code}`);
          console.error(`       Message: ${issue.message}`);
          if (issue.received !== undefined) {
            console.error(`       Received: ${JSON.stringify(issue.received)}`);
          }
          if (issue.expected !== undefined) {
            console.error(`       Expected: ${issue.expected}`);
          }
        });
        
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
            received: issue.received,
            expected: issue.expected
          }))
        });
      }
      
      console.error("  Full error:", error);
      res.status(400).json({ error: error.message || "Invalid savings goal data" });
    }
  });

  app.patch("/api/savings-goals/:id", authenticateToken, async (req, res) => {
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

  app.delete("/api/savings-goals/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const goalId = parseInt(req.params.id);
      
      // First verify the goal belongs to the user
      const existingGoal = await storage.getSavingsGoal(goalId);
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ error: "Savings goal not found" });
      }
      
      const deleted = await storage.deleteSavingsGoal(goalId);
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
  app.get("/api/savings-goals/:goalId/contributions", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const goalId = parseInt(req.params.goalId);
      
      // First verify the goal belongs to the user
      const goal = await storage.getSavingsGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ error: "Savings goal not found" });
      }
      
      const contributions = await storage.getSavingsContributions(goalId);
      res.json(contributions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contributions" });
    }
  });

  app.post("/api/savings-goals/:goalId/contributions", authenticateToken, async (req, res) => {
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
      
      // Get toggle settings from request body (override goal settings for this contribution only)
      // Default to goal settings if not provided in request
      const affectTransaction = req.body.createTransaction !== undefined 
        ? req.body.createTransaction 
        : (goal.affectTransaction ?? true);
      const affectAccountBalance = req.body.affectBalance !== undefined 
        ? req.body.affectBalance 
        : (goal.affectAccountBalance ?? true);
      
      // Handle transaction and balance updates based on toggle settings
      if (affectTransaction && goal.accountId && goal.toAccountId) {
        // When both from and to accounts are specified, create a single transfer transaction
        await storage.createTransaction({
          userId: goal.userId,
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
            const currentBalance = parseFloat(fromAccount.balance || '0');
            const contributionAmount = parseFloat(validatedData.amount);
            // Add amount back to reverse the debit
            await storage.updateAccount(goal.accountId, {
              balance: (currentBalance + contributionAmount).toString()
            });
          }
          
          // Reverse to account balance change
          const toAccount = await storage.getAccount(goal.toAccountId);
          if (toAccount) {
            const currentBalance = parseFloat(toAccount.balance || '0');
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
          userId: goal.userId,
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
            const currentBalance = parseFloat(account.balance || '0');
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
          userId: goal.userId,
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
            const currentBalance = parseFloat(account.balance || '0');
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
            const currentBalance = parseFloat(account.balance || '0');
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
            const currentBalance = parseFloat(toAccount.balance || '0');
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

  app.delete("/api/savings-contributions/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const contributionId = parseInt(req.params.id);
      
      // Get contribution details before deleting
      const contribution = await storage.getSavingsContribution(contributionId);
      
      if (!contribution) {
        return res.status(404).json({ error: "Contribution not found" });
      }
      
      // Get the goal to access account configuration and verify user ownership
      const goal = await storage.getSavingsGoal(contribution.savingsGoalId);
      if (!goal || goal.userId !== userId) {
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
  app.get("/api/salary-profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const profile = await storage.getSalaryProfile(userId);
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch salary profile" });
    }
  });

  app.post("/api/salary-profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const profileData = { ...req.body, userId };
      const validatedData = insertSalaryProfileSchema.parse(profileData);
      const profile = await storage.createSalaryProfile(validatedData);
      
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
              expectedPayDate: payday.date,
              expectedAmount: profile.monthlyAmount ?? undefined,
              actualPayDate: undefined,
              actualAmount: undefined,
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

  app.patch("/api/salary-profile/:id", authenticateToken, async (req, res) => {
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
                expectedPayDate: payday.date,
                expectedAmount: profile.monthlyAmount ?? undefined,
                actualPayDate: undefined,
                actualAmount: undefined,
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

  app.get("/api/salary-profile/next-paydays", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const profile = await storage.getSalaryProfile(userId);
      if (!profile) {
        res.json([]);
        return;
      }
      const count = req.query.count ? parseInt(req.query.count as string) : 6;
      const calculatedPaydays = getNextPaydays(
        profile.paydayRule || 'last_working_day',
        profile.fixedDay,
        profile.weekdayPreference,
        count + 2
      );
      
      const cycles = await storage.getSalaryCycles(profile.id);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const paydays = calculatedPaydays.map(payday => {
        const cycle = cycles.find(c => c.month === payday.month && c.year === payday.year);
        if (cycle && cycle.expectedPayDate) {
          return {
            ...payday,
            date: new Date(cycle.expectedPayDate),
            expectedAmount: cycle.expectedAmount,
            cycleId: cycle.id,
          };
        }
        return {
          ...payday,
          expectedAmount: profile.monthlyAmount,
        };
      });
      
      const futurePaydays = paydays.filter(p => {
        const payDate = new Date(p.date);
        payDate.setHours(0, 0, 0, 0);
        return payDate >= now;
      });
      
      res.json(futurePaydays.slice(0, count));
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate next paydays" });
    }
  });

  // ========== Salary Cycles ==========
  app.get("/api/salary-cycles", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const profile = await storage.getSalaryProfile(userId);
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

  app.post("/api/salary-cycles", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const profile = await storage.getSalaryProfile(userId);
      if (!profile) {
        res.status(400).json({ error: "Please create a salary profile first" });
        return;
      }
      const { month, year, expectedPayDate: customPayDate, expectedAmount: customAmount } = req.body;
      
      // Check if cycle already exists for this month/year
      const existingCycles = await storage.getSalaryCycles(profile.id);
      const existingCycle = existingCycles.find(c => c.month === month && c.year === year);
      
      if (existingCycle) {
        // Update existing cycle with custom values
        const updateData: any = {};
        if (customPayDate) {
          updateData.expectedPayDate = new Date(customPayDate);
        }
        if (customAmount) {
          updateData.expectedAmount = customAmount;
        }
        const updated = await storage.updateSalaryCycle(existingCycle.id, updateData);
        res.status(200).json(updated);
        return;
      }
      
      // Calculate default expected pay date if not provided
      const defaultPayDate = getPaydayForMonth(
        year,
        month,
        profile.paydayRule || 'last_working_day',
        profile.fixedDay,
        profile.weekdayPreference
      );
      
      // Use custom values if provided, otherwise use defaults
      const finalPayDate = customPayDate ? new Date(customPayDate) : defaultPayDate;
      const finalAmount = customAmount || profile.monthlyAmount || undefined;
      
      const validatedData = insertSalaryCycleSchema.parse({
        salaryProfileId: profile.id,
        month,
        year,
        expectedPayDate: finalPayDate,
        expectedAmount: finalAmount,
      });
      const cycle = await storage.createSalaryCycle(validatedData);
      res.status(201).json(cycle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid salary cycle data" });
    }
  });

  app.patch("/api/salary-cycles/:id", authenticateToken, async (req, res) => {
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
      const userId = req.user!.userId;
      const profile = await storage.getSalaryProfile(userId);
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
            userId: userId,
            accountId: profile.accountId,
            categoryId: salaryCategory.id,
            type: 'credit',
            amount: updateData.actualAmount,
            transactionDate: new Date(updateData.actualPayDate).toISOString(),
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
  app.get("/api/budget-summary", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { month, year } = req.query;
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

      const budgets = await storage.getAllBudgets({ userId, month: currentMonth, year: currentYear });
      const categories = await storage.getAllCategories();
      
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
      const transactions = await storage.getAllTransactions({
        userId,
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
  app.get("/api/dashboard", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Get credit card billing cycle spending
  app.get("/api/credit-card-spending", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const cycle = req.query.cycle as string || 'current'; // 'current' or 'previous'
      const accounts = await storage.getAllAccounts(userId);
      const creditCards = accounts.filter(acc => acc.type === 'credit_card' && acc.isActive && acc.billingDate);
      
      const cardSpending = [];
      
      for (const card of creditCards) {
        const now = new Date();
        const currentDay = now.getDate();
        const billingDay = card.billingDate!;
        
        // Determine billing cycle dates based on requested cycle
        let cycleStartDate: Date;
        let cycleEndDate: Date;
        
        if (cycle === 'previous') {
          // Previous complete cycle - this represents the bill that will be paid this month
          // Example: Today is Jan 14, billing date 13
          // Previous cycle: Dec 13 to Jan 12 (this is the Jan bill)
          if (currentDay >= billingDay) {
            // We're past billing date, so previous cycle is last month to this month
            cycleStartDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay, 0, 0, 0);
            cycleEndDate = new Date(now.getFullYear(), now.getMonth(), billingDay - 1, 23, 59, 59);
          } else {
            // We're before billing date, so previous cycle is 2 months ago to last month
            cycleStartDate = new Date(now.getFullYear(), now.getMonth() - 2, billingDay, 0, 0, 0);
            cycleEndDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay - 1, 23, 59, 59);
          }
        } else {
          // Current cycle
          if (currentDay >= billingDay) {
            // Current cycle: billingDay of this month to next month's billingDay - 1
            cycleStartDate = new Date(now.getFullYear(), now.getMonth(), billingDay, 0, 0, 0);
            cycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay - 1, 23, 59, 59);
          } else {
            // Previous cycle: billingDay of last month to this month's billingDay - 1
            cycleStartDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay, 0, 0, 0);
            cycleEndDate = new Date(now.getFullYear(), now.getMonth(), billingDay - 1, 23, 59, 59);
          }
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
        const availableCredit = parseFloat(card.balance || '0');
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
  app.get("/api/expenses/monthly", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
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
  app.get("/api/credit-card-spending/monthly", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const accounts = await storage.getAllAccounts(userId);
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

  app.get("/api/expenses/category-breakdown", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
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
      
      // Build SMS log data
      const smsLogData: any = {
        message,
        receivedAt: receivedAt || new Date().toISOString(),
        isParsed: false,
      };
      
      // Only add sender if it's provided and not empty
      if (sender && typeof sender === 'string') {
        smsLogData.sender = sender;
      }
      
      // Create SMS log
      const smsLog = await storage.createSmsLog(smsLogData);

      // Parse SMS for transaction data
      const parsedData = await parseSmsMessage(message, sender);
      
      if (parsedData && parsedData.amount) {
        // Use OpenAI to suggest category based on merchant/description (with fallback)
        let category;
        try {
          console.log(`Calling OpenAI to categorize: "${parsedData.merchant || parsedData.description}"`);
          const categoryName = await suggestCategory(parsedData.merchant || parsedData.description || "");
          console.log(`OpenAI suggested category: ${categoryName}`);
          category = await storage.getCategoryByName(categoryName);
        } catch (error: any) {
          console.error(`OpenAI failed (${error.message}), using fallback categorization`);
          // Fallback uses keyword matching based on merchant/description
          const fallbackCategoryName = fallbackCategorization(parsedData.merchant || parsedData.description || "");
          console.log(`Fallback suggested category: ${fallbackCategoryName}`);
          category = await storage.getCategoryByName(fallbackCategoryName);
        }
        
        // Get default account or first active account
        const accounts = await storage.getAllAccounts();
        const defaultAccount = accounts.find(acc => acc.isDefault) || accounts.find(acc => acc.isActive) || accounts[0];
        
        // Build transaction data object
        const transactionData: any = {
          amount: parsedData.amount.toString(),
          type: parsedData.type || "debit",
          transactionDate: parsedData.date || new Date().toISOString(),
        };
        
        // Only add optional fields if they have values
        if (parsedData.description) transactionData.description = parsedData.description;
        if (parsedData.merchant) transactionData.merchant = parsedData.merchant;
        if (parsedData.referenceNumber) transactionData.referenceNumber = parsedData.referenceNumber;
        if (category?.id) transactionData.categoryId = category.id;
        if (defaultAccount?.id) transactionData.accountId = defaultAccount.id;
        if (smsLog?.id) transactionData.smsId = smsLog.id;
        
        // Create transaction
        const transaction = await storage.createTransaction(transactionData);

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
      console.error("SMS parsing error:", error.message);
      res.status(500).json({ error: error.message || "Failed to parse SMS" });
    }
  });

  // ========== Batch SMS Parsing ==========
  app.post("/api/parse-sms-batch", async (req, res) => {
    try {
      const { messages } = req.body; // Array of SMS message strings or objects
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const results = [];
      const accounts = await storage.getAllAccounts();
      const defaultAccount = accounts.find(acc => acc.isDefault) || accounts.find(acc => acc.isActive) || accounts[0];
      
      for (const msg of messages) {
        const messageText = typeof msg === 'string' ? msg : msg.message;
        const sender = typeof msg === 'string' ? undefined : msg.sender;
        
        try {
          // Create SMS log
          const smsLogData: any = {
            message: messageText,
            receivedAt: new Date().toISOString(),
            isParsed: false,
          };
          if (sender) smsLogData.sender = sender;
          
          const smsLog = await storage.createSmsLog(smsLogData);

          // Parse SMS
          const parsedData = await parseSmsMessage(messageText, sender);
          
          if (parsedData && parsedData.amount) {
            // Get category
            let category;
            try {
              const categoryName = await suggestCategory(parsedData.merchant || parsedData.description || "");
              category = await storage.getCategoryByName(categoryName);
            } catch (error: any) {
              const fallbackCategoryName = fallbackCategorization(parsedData.merchant || parsedData.description || "");
              category = await storage.getCategoryByName(fallbackCategoryName);
            }
            
            // Build transaction data
            const transactionData: any = {
              amount: parsedData.amount.toString(),
              type: parsedData.type || "debit",
              transactionDate: parsedData.date || new Date().toISOString(),
            };
            
            if (parsedData.description) transactionData.description = parsedData.description;
            if (parsedData.merchant) transactionData.merchant = parsedData.merchant;
            if (parsedData.referenceNumber) transactionData.referenceNumber = parsedData.referenceNumber;
            if (category?.id) transactionData.categoryId = category.id;
            if (defaultAccount?.id) transactionData.accountId = defaultAccount.id;
            if (smsLog?.id) transactionData.smsId = smsLog.id;
            
            // Create transaction
            const transaction = await storage.createTransaction(transactionData);
            await storage.updateSmsLogTransaction(smsLog.id, transaction.id);
            
            results.push({ 
              success: true, 
              transaction,
              message: messageText.substring(0, 50) + '...'
            });
          } else {
            results.push({ 
              success: false, 
              message: messageText.substring(0, 50) + '...',
              error: "Could not parse transaction data"
            });
          }
        } catch (error: any) {
          results.push({ 
            success: false, 
            message: messageText.substring(0, 50) + '...',
            error: error.message 
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      res.json({ 
        total: messages.length,
        successful,
        failed: messages.length - successful,
        results 
      });
    } catch (error: any) {
      console.error("Batch SMS parsing error:", error.message);
      res.status(500).json({ error: error.message || "Failed to parse batch SMS" });
    }
  });

  // ========== Export Data ==========
  app.post("/api/export", authenticateToken, async (req, res) => {
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
  app.get("/api/user", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/user", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const user = await storage.updateUser(userId, req.body);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/user/set-pin", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { pin } = req.body;
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        res.status(400).json({ error: "PIN must be 4 digits" });
        return;
      }
      const pinHash = await bcrypt.hash(pin, 10);
      await storage.updateUser(userId, { pinHash });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set PIN" });
    }
  });

  app.post("/api/user/verify-pin", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { pin } = req.body;
      if (!pin) {
        res.json({ valid: false, message: "PIN required" });
        return;
      }
      const user = await storage.getUser(userId);
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

  app.post("/api/user/reset-pin", authenticateToken, async (req, res) => {
    try {
      await storage.updateUser(1, { pinHash: null });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset PIN" });
    }
  });

  // ========== Loans ==========
  app.get("/api/loans", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const loans = await storage.getAllLoans(userId);
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

  app.post("/api/loans", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const loanData = { ...req.body, userId };
      const validatedData = insertLoanSchema.parse(loanData);
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

  app.post("/api/loans/:id/regenerate-installments", authenticateToken, async (req, res) => {
    try {
      const loanId = parseInt(req.params.id);
      console.log('API: Regenerate installments requested for loan:', loanId);
      const installments = await storage.regenerateLoanInstallments(loanId);
      console.log('API: Regeneration successful, created', installments.length, 'installments');
      console.log('API: First installment date:', installments[0]?.dueDate);
      console.log('API: Last installment date:', installments[installments.length - 1]?.dueDate);
      res.json(installments);
    } catch (error: any) {
      console.error('API: Regeneration failed:', error);
      res.status(400).json({ error: error.message || "Failed to regenerate installments" });
    }
  });

  // Pre-close a loan
  app.post("/api/loans/:id/preclose", authenticateToken, async (req, res) => {
    try {
      const loanId = parseInt(req.params.id);
      const { closureAmount, closureDate, accountId, createTransaction } = req.body;

      if (!closureAmount || !closureDate) {
        return res.status(400).json({ error: "Closure amount and date are required" });
      }

      // Get the loan
      const loan = await storage.getLoan(loanId);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      if (loan.status !== 'active') {
        return res.status(400).json({ error: "Only active loans can be pre-closed" });
      }

      // Record the preclosure payment
      const closureAmountNum = parseFloat(closureAmount);
      const closureDateObj = new Date(closureDate);
      
      await storage.createLoanPayment({
        loanId,
        paymentDate: closureDateObj,
        amount: closureAmount,
        principalPaid: loan.outstandingAmount, // Principal equals outstanding
        interestPaid: String(Math.max(0, closureAmountNum - parseFloat(loan.outstandingAmount))),
        paymentType: 'prepayment',
        notes: 'Loan Pre-Closure',
        accountId: accountId || null,
      });

      // Update the loan status
      const updatedLoan = await storage.updateLoan(loanId, {
        status: 'preclosed',
        outstandingAmount: '0',
        closureDate: closureDateObj,
        closureAmount,
      });

      // Cancel pending installments
      const installments = await storage.getLoanInstallments(loanId);
      for (const inst of installments) {
        if (inst.status === 'pending') {
          await storage.updateLoanInstallment(inst.id, { status: 'cancelled' as any });
        }
      }

      // Optionally create a transaction
      if (createTransaction && accountId) {
        // Get or create "Loan" category
        const allCategories = await storage.getAllCategories();
        let loanCategory = allCategories.find((c: { name: string }) => c.name === 'Loan' || c.name === 'EMI');
        if (!loanCategory) {
          loanCategory = await storage.createCategory({
            name: 'Loan',
            type: 'expense',
            icon: 'cash',
            color: '#10b981',
          });
        }

        await storage.createTransaction({
          userId: 1,
          accountId,
          categoryId: loanCategory.id,
          type: 'debit',
          amount: closureAmount,
          merchant: `${loan.name} - Pre-Closure`,
          description: `Loan pre-closure payment`,
          transactionDate: closureDate,
        });

        // Update account balance
        const account = await storage.getAccount(accountId);
        if (account && account.balance) {
          const newBalance = parseFloat(account.balance) - closureAmountNum;
          await storage.updateAccount(accountId, { balance: String(newBalance) });
        }
      }

      res.json(updatedLoan);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to pre-close loan" });
    }
  });

  // Top-up a loan (add additional principal)
  app.post("/api/loans/:id/topup", authenticateToken, async (req, res) => {
    try {
      const loanId = parseInt(req.params.id);
      const { 
        topupAmount, 
        disbursementDate, 
        newEmiAmount, 
        additionalTenure,
        interestRate,
        accountId, 
        createTransaction,
        notes 
      } = req.body;

      if (!topupAmount || parseFloat(topupAmount) <= 0) {
        return res.status(400).json({ error: "Valid top-up amount is required" });
      }

      // Get the loan
      const loan = await storage.getLoan(loanId);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      if (loan.status !== 'active') {
        return res.status(400).json({ error: "Only active loans can be topped up" });
      }

      const topupAmountNum = parseFloat(topupAmount);
      const currentOutstanding = parseFloat(loan.outstandingAmount);
      const currentPrincipal = parseFloat(loan.principalAmount);
      const newOutstanding = currentOutstanding + topupAmountNum;
      const newPrincipal = currentPrincipal + topupAmountNum;
      
      // Calculate new tenure if additional tenure is provided
      const currentTenure = loan.tenure || 0;
      const newTenure = additionalTenure ? currentTenure + parseInt(additionalTenure) : currentTenure;
      
      // Use new EMI if provided, otherwise keep existing
      const effectiveEmi = newEmiAmount || loan.emiAmount;
      const effectiveRate = interestRate || loan.interestRate;

      // Create a loan term record to track the top-up
      const effectiveFromDate = disbursementDate ? new Date(disbursementDate) : new Date();
      
      await storage.createLoanTerm({
        loanId,
        effectiveFrom: effectiveFromDate,
        interestRate: effectiveRate,
        tenureMonths: newTenure,
        emiAmount: effectiveEmi,
        outstandingAtChange: String(newOutstanding),
        reason: `Top-up of ${topupAmount}`,
        notes: notes || `Loan top-up: Added principal ${topupAmount}`,
      });

      // Update the loan with new amounts
      const updatedLoan = await storage.updateLoan(loanId, {
        principalAmount: String(newPrincipal),
        outstandingAmount: String(newOutstanding),
        tenure: newTenure,
        emiAmount: effectiveEmi,
        interestRate: effectiveRate,
      });

      // Optionally credit the top-up amount to account
      if (createTransaction && accountId) {
        // Get or create "Loan" category
        const allCategories = await storage.getAllCategories();
        let loanCategory = allCategories.find((c: { name: string }) => c.name === 'Loan' || c.name === 'Loan Disbursement');
        if (!loanCategory) {
          loanCategory = await storage.createCategory({
            name: 'Loan Disbursement',
            type: 'income',
            icon: 'cash',
            color: '#10b981',
          });
        }

        await storage.createTransaction({
          userId: 1,
          accountId,
          categoryId: loanCategory.id,
          type: 'credit',
          amount: topupAmount,
          merchant: `${loan.name} - Top-Up`,
          description: `Loan top-up disbursement`,
          transactionDate: effectiveFromDate.toISOString().split('T')[0],
        });

        // Update account balance (credit = add money)
        const account = await storage.getAccount(accountId);
        if (account && account.balance) {
          const newBalance = parseFloat(account.balance) + topupAmountNum;
          await storage.updateAccount(accountId, { balance: String(newBalance) });
        }
      }

      // Regenerate future installments
      await storage.generateLoanInstallments(loanId);

      res.json(updatedLoan);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to top-up loan" });
    }
  });

  // Part Payment - pay extra to reduce outstanding principal
  app.post("/api/loans/:id/part-payment", authenticateToken, async (req, res) => {
    try {
      const loanId = parseInt(req.params.id);
      const { amount, paymentDate, effect, accountId, createTransaction } = req.body;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valid payment amount is required" });
      }

      const paymentAmount = parseFloat(amount);

      // Get the loan
      const loan = await storage.getLoan(loanId);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      if (loan.status !== 'active') {
        return res.status(400).json({ error: "Only active loans can receive part payments" });
      }

      const outstanding = parseFloat(loan.outstandingAmount);
      if (paymentAmount > outstanding) {
        return res.status(400).json({ error: "Payment amount cannot exceed outstanding balance" });
      }

      // Update outstanding amount
      const newOutstanding = outstanding - paymentAmount;
      
      // Calculate new EMI or tenure based on effect choice
      let updateData: any = {
        outstandingAmount: newOutstanding.toFixed(2),
      };

      // If payment closes the loan
      if (newOutstanding <= 0) {
        const paymentDateObj = new Date(paymentDate);
        updateData.status = 'preclosed';
        updateData.closureDate = paymentDateObj;
        updateData.closureAmount = paymentAmount.toFixed(2);
      }

      const updatedLoan = await storage.updateLoan(loanId, updateData);

      // Create payment record
      await storage.createLoanPayment({
        loanId,
        paymentDate: new Date(paymentDate),
        amount: amount,
        paymentType: 'prepayment',
        accountId: accountId || null,
        notes: effect === 'reduce_emi' 
          ? 'Part payment - Reduce EMI' 
          : 'Part payment - Reduce Tenure'
      });

      // Add a term record to track this event
      const currentTerm = await storage.getLoanTerms(loanId);
      const latestTerm = currentTerm.length > 0 ? currentTerm[currentTerm.length - 1] : null;
      
      await storage.createLoanTerm({
        loanId,
        effectiveFrom: new Date(paymentDate),
        interestRate: latestTerm ? latestTerm.interestRate : loan.interestRate || '0',
        tenureMonths: latestTerm ? latestTerm.tenureMonths : loan.tenure,
        emiAmount: latestTerm ? latestTerm.emiAmount : (loan.emiAmount || '0'),
        reason: `Part payment of ${amount} - ${effect === 'reduce_emi' ? 'Reduce EMI' : 'Reduce Tenure'}`,
      });

      // Optionally create a transaction
      if (createTransaction && accountId) {
        const allCategories = await storage.getAllCategories();
        let loanCategory = allCategories.find((c: { name: string }) => c.name === 'Loan' || c.name === 'EMI');
        if (!loanCategory) {
          loanCategory = await storage.createCategory({
            name: 'Loan',
            type: 'expense',
            icon: 'cash',
            color: '#10b981',
          });
        }

        await storage.createTransaction({
          userId: 1,
          accountId,
          categoryId: loanCategory.id,
          type: 'debit',
          amount: amount,
          merchant: `${loan.name} - Part Payment`,
          description: effect === 'reduce_emi' 
            ? 'Part payment to reduce EMI' 
            : 'Part payment to reduce tenure',
          transactionDate: paymentDate,
        });

        // Update account balance
        const account = await storage.getAccount(accountId);
        if (account && account.balance) {
          const newBalance = parseFloat(account.balance) - paymentAmount;
          await storage.updateAccount(accountId, { balance: String(newBalance) });
        }
      }

      res.json(updatedLoan);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to process part payment" });
    }
  });

  app.post("/api/loans/:id/generate-schedule", authenticateToken, async (req, res) => {
    try {
      const installments = await storage.generateLoanInstallments(parseInt(req.params.id));
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate installments" });
    }
  });

  app.post("/api/loans/:id/generate-installments", authenticateToken, async (req, res) => {
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

  app.post("/api/loans/:loanId/installments/:id/pay", authenticateToken, async (req, res) => {
    try {
      const { paidDate, paidAmount, accountId, notes, createTransaction, affectBalance } = req.body;
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
      
      // Create transaction if requested
      if (createTransaction && accountId) {
        const loan = await storage.getLoan(loanId);
        const allCategories = await storage.getAllCategories();
        let loanCategory = allCategories.find((c: { name: string }) => c.name === 'Loan' || c.name === 'EMI');
        if (!loanCategory) {
          loanCategory = await storage.createCategory({
            name: 'EMI',
            type: 'expense',
            icon: 'cash',
            color: '#ef4444',
          });
        }

        await storage.createTransaction({
          userId: 1,
          accountId,
          categoryId: loanCategory.id,
          type: 'debit',
          amount: paidAmount,
          merchant: loan?.name || 'Loan EMI',
          description: `EMI payment for ${loan?.name || 'Loan'}`,
          transactionDate: paidDate,
        });
      }

      // Update account balance if requested
      if (affectBalance && accountId) {
        const account = await storage.getAccount(accountId);
        if (account && account.balance) {
          const newBalance = parseFloat(account.balance) - parseFloat(paidAmount);
          await storage.updateAccount(accountId, { balance: String(newBalance) });
        }
      }
      
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

  app.post("/api/loans/:loanId/terms", authenticateToken, async (req, res) => {
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

  app.post("/api/loans/:loanId/payments", authenticateToken, async (req, res) => {
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

  app.post("/api/loans/:loanId/components", authenticateToken, async (req, res) => {
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

  // ========== Loan BT Allocations ==========
  app.get("/api/loans/:loanId/bt-allocations", async (req, res) => {
    try {
      const allocations = await storage.getLoanBtAllocations(parseInt(req.params.loanId));
      res.json(allocations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BT allocations" });
    }
  });

  app.get("/api/loans/:loanId/bt-allocations-as-target", async (req, res) => {
    try {
      const allocations = await storage.getLoanBtAllocationsByTarget(parseInt(req.params.loanId));
      res.json(allocations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BT allocations" });
    }
  });

  app.get("/api/bt-allocations/:id", async (req, res) => {
    try {
      const allocation = await storage.getLoanBtAllocation(parseInt(req.params.id));
      if (allocation) {
        res.json(allocation);
      } else {
        res.status(404).json({ error: "BT allocation not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BT allocation" });
    }
  });

  app.post("/api/loans/:loanId/bt-allocations", authenticateToken, async (req, res) => {
    try {
      const allocation = await storage.createLoanBtAllocation({
        ...req.body,
        sourceLoanId: parseInt(req.params.loanId),
      });
      res.status(201).json(allocation);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create BT allocation" });
    }
  });

  app.patch("/api/bt-allocations/:id", async (req, res) => {
    try {
      const allocation = await storage.updateLoanBtAllocation(parseInt(req.params.id), req.body);
      if (allocation) {
        res.json(allocation);
      } else {
        res.status(404).json({ error: "BT allocation not found" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid BT allocation data" });
    }
  });

  app.delete("/api/bt-allocations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLoanBtAllocation(parseInt(req.params.id));
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "BT allocation not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete BT allocation" });
    }
  });

  app.post("/api/bt-allocations/:id/process", authenticateToken, async (req, res) => {
    try {
      const { actualBtAmount, processedDate, processingFee } = req.body;
      
      if (!actualBtAmount || !processedDate) {
        return res.status(400).json({ error: "actualBtAmount and processedDate are required" });
      }

      const result = await storage.processLoanBtPayment(
        parseInt(req.params.id),
        actualBtAmount,
        new Date(processedDate),
        processingFee
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to process BT payment" });
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
  app.get("/api/insurances", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const insurances = await storage.getAllInsurances(userId);
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

  app.post("/api/insurances", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const insuranceData = { ...req.body, userId };
      const validatedData = insertInsuranceSchema.parse(insuranceData);
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

  app.post("/api/insurances/:insuranceId/premiums", authenticateToken, async (req, res) => {
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

  app.post("/api/insurances/:insuranceId/premiums/:id/pay", authenticateToken, async (req, res) => {
    try {
      const { amount, accountId, createTransaction: shouldCreateTransaction, affectAccountBalance } = req.body;
      const premiumId = parseInt(req.params.id);
      const insuranceId = parseInt(req.params.insuranceId);
      
      let transactionId: number | undefined;
      const targetAccountId = accountId;
      
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
            userId: insurance.userId,
            accountId: targetAccountId || insurance.accountId,
            categoryId: category.id,
            amount,
            type: "debit",
            description: `Insurance Premium - ${insurance.name}`,
            merchant: insurance.providerName || insurance.name,
            transactionDate: new Date().toISOString()
          });
          transactionId = transaction.id;
        }
      }
      
      // Deduct from account balance if requested
      if (affectAccountBalance && targetAccountId) {
        const account = await storage.getAccount(targetAccountId);
        if (account) {
          const currentBalance = parseFloat(account.balance || '0') || 0;
          const paymentAmount = parseFloat(amount) || 0;
          const newBalance = (currentBalance - paymentAmount).toFixed(2);
          await storage.updateAccount(targetAccountId, { balance: newBalance });
        }
      }
      
      const premium = await storage.markPremiumPaid(premiumId, amount, targetAccountId, transactionId);
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
  app.post("/api/insurances/:id/regenerate-premiums", authenticateToken, async (req, res) => {
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
