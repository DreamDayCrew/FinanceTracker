import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for PIN/biometric authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().default("User"),
  pinHash: varchar("pin_hash", { length: 255 }),
  biometricEnabled: boolean("biometric_enabled").default(false),
  theme: varchar("theme", { length: 10 }).default("light"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Accounts (bank accounts, credit cards, debit cards)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'bank', 'credit_card', 'debit_card'
  bankName: varchar("bank_name", { length: 100 }),
  accountNumber: varchar("account_number", { length: 50 }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }), // only for credit cards
  billingDate: integer("billing_date"), // day of month (1-31) for credit card billing cycle
  linkedAccountId: integer("linked_account_id"), // for debit cards - links to bank account
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["bank", "credit_card", "debit_card"]),
  balance: z.string().optional(),
  creditLimit: z.string().optional(),
  billingDate: z.number().min(1).max(31).optional(),
  linkedAccountId: z.number().optional(),
  userId: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Categories for transactions
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  type: varchar("type", { length: 20 }).default("expense"), // 'expense', 'income', 'transfer'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Default categories list
export const DEFAULT_CATEGORIES = [
  { name: "Groceries", icon: "shopping-cart", color: "#4CAF50", type: "expense" },
  { name: "Transport", icon: "car", color: "#2196F3", type: "expense" },
  { name: "Dining", icon: "utensils", color: "#FF9800", type: "expense" },
  { name: "Shopping", icon: "shopping-bag", color: "#E91E63", type: "expense" },
  { name: "Entertainment", icon: "film", color: "#9C27B0", type: "expense" },
  { name: "Bills", icon: "file-text", color: "#607D8B", type: "expense" },
  { name: "Health", icon: "heart", color: "#F44336", type: "expense" },
  { name: "Education", icon: "book", color: "#3F51B5", type: "expense" },
  { name: "Travel", icon: "plane", color: "#00BCD4", type: "expense" },
  { name: "Salary", icon: "briefcase", color: "#4CAF50", type: "income" },
  { name: "Investment", icon: "trending-up", color: "#8BC34A", type: "income" },
  { name: "Transfer", icon: "repeat", color: "#795548", type: "transfer" },
  { name: "Other", icon: "more-horizontal", color: "#9E9E9E", type: "expense" },
] as const;

// Transactions (from SMS parsing or manual entry)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountId: integer("account_id").references(() => accounts.id),
  categoryId: integer("category_id").references(() => categories.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'debit', 'credit'
  description: text("description"),
  merchant: varchar("merchant", { length: 200 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  transactionDate: timestamp("transaction_date").notNull(),
  smsId: integer("sms_id"),
  isRecurring: boolean("is_recurring").default(false),
  savingsContributionId: integer("savings_contribution_id"), // Link to savings contribution if this is a contribution transaction
  paymentOccurrenceId: integer("payment_occurrence_id"), // Link to scheduled payment occurrence if this is a scheduled payment transaction
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
}));

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["debit", "credit"]),
  transactionDate: z.string().optional(),
  savingsContributionId: z.number().optional(),
  paymentOccurrenceId: z.number().optional(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Budgets (monthly category budgets)
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().min(1, "Budget amount is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Scheduled Payments (recurring payments with reminders)
export const scheduledPayments = pgTable("scheduled_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: integer("due_date").notNull(), // day of month (1-31)
  categoryId: integer("category_id").references(() => categories.id),
  accountId: integer("account_id").references(() => accounts.id),
  frequency: varchar("frequency", { length: 20 }).default("monthly"), // 'monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'
  startMonth: integer("start_month"), // 1-12, for quarterly/yearly payments
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'inactive'
  notes: text("notes"),
  affectTransaction: boolean("affect_transaction").default(true),
  affectAccountBalance: boolean("affect_account_balance").default(true),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const scheduledPaymentsRelations = relations(scheduledPayments, ({ one }) => ({
  user: one(users, { fields: [scheduledPayments.userId], references: [users.id] }),
  category: one(categories, { fields: [scheduledPayments.categoryId], references: [categories.id] }),
  account: one(accounts, { fields: [scheduledPayments.accountId], references: [accounts.id] }),
}));

export const insertScheduledPaymentSchema = createInsertSchema(scheduledPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastNotifiedAt: true,
}).extend({
  name: z.string().min(1, "Payment name is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.number().min(1).max(31),
  frequency: z.enum(["monthly", "quarterly", "half_yearly", "yearly", "one_time"]).optional(),
  startMonth: z.number().min(1).max(12).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type InsertScheduledPayment = z.infer<typeof insertScheduledPaymentSchema>;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;

// Payment Occurrences (monthly checklist for scheduled payments)
export const paymentOccurrences = pgTable("payment_occurrences", {
  id: serial("id").primaryKey(),
  scheduledPaymentId: integer("scheduled_payment_id").references(() => scheduledPayments.id).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'paid', 'skipped'
  paidAt: timestamp("paid_at"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  affectTransaction: boolean("affect_transaction").default(true),
  affectAccountBalance: boolean("affect_account_balance").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentOccurrencesRelations = relations(paymentOccurrences, ({ one }) => ({
  scheduledPayment: one(scheduledPayments, { fields: [paymentOccurrences.scheduledPaymentId], references: [scheduledPayments.id] }),
}));

export const insertPaymentOccurrenceSchema = createInsertSchema(paymentOccurrences).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  status: z.enum(["pending", "paid", "skipped"]).optional(),
});

export type InsertPaymentOccurrence = z.infer<typeof insertPaymentOccurrenceSchema>;
export type PaymentOccurrence = typeof paymentOccurrences.$inferSelect;

// Savings Goals
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).default("0"),
  targetDate: timestamp("target_date"),
  accountId: integer("account_id").references(() => accounts.id), // from account
  toAccountId: integer("to_account_id").references(() => accounts.id), // to account (optional)
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'completed', 'paused'
  affectTransaction: boolean("affect_transaction").default(true), // whether to create transaction history
  affectAccountBalance: boolean("affect_account_balance").default(true), // whether to affect account balance
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const savingsGoalsRelations = relations(savingsGoals, ({ one, many }) => ({
  user: one(users, { fields: [savingsGoals.userId], references: [users.id] }),
  account: one(accounts, { fields: [savingsGoals.accountId], references: [accounts.id] }),
  toAccount: one(accounts, { fields: [savingsGoals.toAccountId], references: [accounts.id] }),
  contributions: many(savingsContributions),
}));

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().min(1, "Target amount is required"),
  currentAmount: z.string().optional(),
  accountId: z.number().optional(),
  toAccountId: z.number().optional().nullable(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  affectTransaction: z.boolean().optional(),
  affectAccountBalance: z.boolean().optional(),
});

export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;
export type SavingsGoal = typeof savingsGoals.$inferSelect;

// Savings Contributions
export const savingsContributions = pgTable("savings_contributions", {
  id: serial("id").primaryKey(),
  savingsGoalId: integer("savings_goal_id").references(() => savingsGoals.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  contributedAt: timestamp("contributed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savingsContributionsRelations = relations(savingsContributions, ({ one }) => ({
  savingsGoal: one(savingsGoals, { fields: [savingsContributions.savingsGoalId], references: [savingsGoals.id] }),
  account: one(accounts, { fields: [savingsContributions.accountId], references: [accounts.id] }),
}));

export const insertSavingsContributionSchema = createInsertSchema(savingsContributions).omit({
  id: true,
  createdAt: true,
  contributedAt: true,
}).extend({
  amount: z.string().min(1, "Amount is required"),
  accountId: z.number().optional(),
  contributedAt: z.string().optional(),
});

export type InsertSavingsContribution = z.infer<typeof insertSavingsContributionSchema>;
export type SavingsContribution = typeof savingsContributions.$inferSelect;

// Salary Profile (configuration for payday)
export const salaryProfiles = pgTable("salary_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountId: integer("account_id").references(() => accounts.id),
  paydayRule: varchar("payday_rule", { length: 30 }).default("last_working_day"), // 'fixed_day', 'last_working_day', 'nth_weekday'
  fixedDay: integer("fixed_day"), // day of month if payday_rule is 'fixed_day'
  weekdayPreference: integer("weekday_preference"), // 0=Sun, 1=Mon... for nth_weekday rule
  monthlyAmount: decimal("monthly_amount", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const salaryProfilesRelations = relations(salaryProfiles, ({ one, many }) => ({
  user: one(users, { fields: [salaryProfiles.userId], references: [users.id] }),
  account: one(accounts, { fields: [salaryProfiles.accountId], references: [accounts.id] }),
  cycles: many(salaryCycles),
}));

export const insertSalaryProfileSchema = createInsertSchema(salaryProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  paydayRule: z.enum(["fixed_day", "last_working_day", "nth_weekday"]).optional(),
  fixedDay: z.number().min(1).max(31).nullish(),
  monthlyAmount: z.string().optional(),
  accountId: z.number().optional(),
});

export type InsertSalaryProfile = z.infer<typeof insertSalaryProfileSchema>;
export type SalaryProfile = typeof salaryProfiles.$inferSelect;

// Salary Cycles (actual salary records per month)
export const salaryCycles = pgTable("salary_cycles", {
  id: serial("id").primaryKey(),
  salaryProfileId: integer("salary_profile_id").references(() => salaryProfiles.id).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  expectedPayDate: timestamp("expected_pay_date").notNull(),
  actualPayDate: timestamp("actual_pay_date"),
  expectedAmount: decimal("expected_amount", { precision: 12, scale: 2 }),
  actualAmount: decimal("actual_amount", { precision: 12, scale: 2 }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salaryCyclesRelations = relations(salaryCycles, ({ one }) => ({
  salaryProfile: one(salaryProfiles, { fields: [salaryCycles.salaryProfileId], references: [salaryProfiles.id] }),
  transaction: one(transactions, { fields: [salaryCycles.transactionId], references: [transactions.id] }),
}));

export const insertSalaryCycleSchema = createInsertSchema(salaryCycles).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  expectedAmount: z.string().optional(),
  actualAmount: z.string().optional(),
});

export type InsertSalaryCycle = z.infer<typeof insertSalaryCycleSchema>;
export type SalaryCycle = typeof salaryCycles.$inferSelect;

// Loans (home loan, personal loan, credit card loan, item EMI)
export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountId: integer("account_id").references(() => accounts.id), // linked account for auto-tracking
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // 'home_loan', 'personal_loan', 'credit_card_loan', 'item_emi'
  lenderName: varchar("lender_name", { length: 100 }),
  loanAccountNumber: varchar("loan_account_number", { length: 100 }), // stored encrypted
  principalAmount: decimal("principal_amount", { precision: 14, scale: 2 }).notNull(),
  outstandingAmount: decimal("outstanding_amount", { precision: 14, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(), // ROI in percentage
  tenure: integer("tenure").notNull(), // in months
  emiAmount: decimal("emi_amount", { precision: 12, scale: 2 }),
  emiDay: integer("emi_day"), // day of month when EMI is due (1-31)
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'closed', 'defaulted'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const loansRelations = relations(loans, ({ one, many }) => ({
  user: one(users, { fields: [loans.userId], references: [users.id] }),
  account: one(accounts, { fields: [loans.accountId], references: [accounts.id] }),
  installments: many(loanInstallments),
  components: many(loanComponents),
}));

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Loan name is required"),
  type: z.enum(["home_loan", "personal_loan", "credit_card_loan", "item_emi"]),
  principalAmount: z.string().min(1, "Principal amount is required"),
  outstandingAmount: z.string().min(1, "Outstanding amount is required"),
  interestRate: z.string().min(1, "Interest rate is required"),
  tenure: z.number().min(1, "Tenure is required"),
  emiAmount: z.string().optional(),
  emiDay: z.number().min(1).max(31).optional(),
  startDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  endDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)).optional(),
  status: z.enum(["active", "closed", "defaulted"]).optional(),
});

export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loans.$inferSelect;

// Loan Components (for credit card EMI conversions and purchase-specific EMIs)
export const loanComponents = pgTable("loan_components", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => loans.id).notNull(),
  name: varchar("name", { length: 200 }).notNull(), // e.g., "iPhone 15 Pro - 6 month EMI"
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  emiAmount: decimal("emi_amount", { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }), // may differ for CC EMIs
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }),
  tenure: integer("tenure").notNull(), // in months
  remainingTenure: integer("remaining_tenure").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  transactionId: integer("transaction_id").references(() => transactions.id), // linked transaction
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'completed'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loanComponentsRelations = relations(loanComponents, ({ one }) => ({
  loan: one(loans, { fields: [loanComponents.loanId], references: [loans.id] }),
  transaction: one(transactions, { fields: [loanComponents.transactionId], references: [transactions.id] }),
}));

export const insertLoanComponentSchema = createInsertSchema(loanComponents).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Component name is required"),
  originalAmount: z.string().min(1, "Original amount is required"),
  remainingAmount: z.string().min(1, "Remaining amount is required"),
  emiAmount: z.string().min(1, "EMI amount is required"),
  interestRate: z.string().optional(),
  processingFee: z.string().optional(),
  tenure: z.number().min(1, "Tenure is required"),
  remainingTenure: z.number().min(0),
  status: z.enum(["active", "completed"]).optional(),
});

export type InsertLoanComponent = z.infer<typeof insertLoanComponentSchema>;
export type LoanComponent = typeof loanComponents.$inferSelect;

// Loan Installments (EMI schedule with principal/interest breakdown)
export const loanInstallments = pgTable("loan_installments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => loans.id).notNull(),
  loanComponentId: integer("loan_component_id").references(() => loanComponents.id), // optional - for CC EMIs
  installmentNumber: integer("installment_number").notNull(),
  dueDate: timestamp("due_date").notNull(),
  emiAmount: decimal("emi_amount", { precision: 12, scale: 2 }).notNull(),
  principalAmount: decimal("principal_amount", { precision: 12, scale: 2 }),
  interestAmount: decimal("interest_amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'paid', 'overdue', 'skipped'
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
  paidDate: timestamp("paid_date"),
  transactionId: integer("transaction_id").references(() => transactions.id), // linked payment transaction
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loanInstallmentsRelations = relations(loanInstallments, ({ one }) => ({
  loan: one(loans, { fields: [loanInstallments.loanId], references: [loans.id] }),
  loanComponent: one(loanComponents, { fields: [loanInstallments.loanComponentId], references: [loanComponents.id] }),
  transaction: one(transactions, { fields: [loanInstallments.transactionId], references: [transactions.id] }),
}));

export const insertLoanInstallmentSchema = createInsertSchema(loanInstallments).omit({
  id: true,
  createdAt: true,
}).extend({
  installmentNumber: z.number().min(1),
  emiAmount: z.string().min(1, "EMI amount is required"),
  principalAmount: z.string().optional(),
  interestAmount: z.string().optional(),
  paidAmount: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue", "skipped"]).optional(),
});

export type InsertLoanInstallment = z.infer<typeof insertLoanInstallmentSchema>;
export type LoanInstallment = typeof loanInstallments.$inferSelect;

// Card Details (encrypted storage for debit/credit cards)
export const cardDetails = pgTable("card_details", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  cardNumber: text("card_number").notNull(), // encrypted, last 4 digits stored separately
  lastFourDigits: varchar("last_four_digits", { length: 4 }).notNull(),
  cardholderName: varchar("cardholder_name", { length: 100 }),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  cardType: varchar("card_type", { length: 20 }), // 'visa', 'mastercard', 'rupay', 'amex'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
// NOTE: CVV is NOT stored for security reasons

export const cardDetailsRelations = relations(cardDetails, ({ one }) => ({
  account: one(accounts, { fields: [cardDetails.accountId], references: [accounts.id] }),
}));

export const insertCardDetailsSchema = createInsertSchema(cardDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cardNumber: z.string().min(13).max(19, "Valid card number required"),
  lastFourDigits: z.string().length(4, "Last 4 digits required"),
  cardholderName: z.string().optional(),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2024),
  cardType: z.enum(["visa", "mastercard", "rupay", "amex", "other"]).optional(),
});

export type InsertCardDetails = z.infer<typeof insertCardDetailsSchema>;
export type CardDetails = typeof cardDetails.$inferSelect;

// SMS Logs (for tracking parsed messages)
export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sender: varchar("sender", { length: 50 }),
  message: text("message").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  isParsed: boolean("is_parsed").default(false),
  transactionId: integer("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  user: one(users, { fields: [smsLogs.userId], references: [users.id] }),
  transaction: one(transactions, { fields: [smsLogs.transactionId], references: [transactions.id] }),
}));

export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;
export type SmsLog = typeof smsLogs.$inferSelect;

// Loan Terms (track interest rate and tenure changes over time)
export const loanTerms = pgTable("loan_terms", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => loans.id).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"), // null means current term
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  tenureMonths: integer("tenure_months").notNull(),
  emiAmount: decimal("emi_amount", { precision: 12, scale: 2 }).notNull(),
  outstandingAtChange: decimal("outstanding_at_change", { precision: 14, scale: 2 }), // outstanding when this term started
  reason: varchar("reason", { length: 200 }), // e.g., "Rate revision", "Tenure extension"
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loanTermsRelations = relations(loanTerms, ({ one }) => ({
  loan: one(loans, { fields: [loanTerms.loanId], references: [loans.id] }),
}));

export const insertLoanTermSchema = createInsertSchema(loanTerms).omit({
  id: true,
  createdAt: true,
}).extend({
  interestRate: z.string().min(1, "Interest rate is required"),
  tenureMonths: z.number().min(1, "Tenure is required"),
  emiAmount: z.string().min(1, "EMI amount is required"),
  outstandingAtChange: z.string().optional(),
  effectiveFrom: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  effectiveTo: z.union([z.string(), z.date()]).transform((val) => new Date(val)).optional().nullable(),
});

export type InsertLoanTerm = z.infer<typeof insertLoanTermSchema>;
export type LoanTerm = typeof loanTerms.$inferSelect;

// Loan Payments (track actual EMI payments with extra/partial support)
export const loanPayments = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => loans.id).notNull(),
  installmentId: integer("installment_id").references(() => loanInstallments.id),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  principalPaid: decimal("principal_paid", { precision: 12, scale: 2 }),
  interestPaid: decimal("interest_paid", { precision: 12, scale: 2 }),
  paymentType: varchar("payment_type", { length: 20 }).default("emi"), // 'emi', 'prepayment', 'partial'
  accountId: integer("account_id").references(() => accounts.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
  loan: one(loans, { fields: [loanPayments.loanId], references: [loans.id] }),
  installment: one(loanInstallments, { fields: [loanPayments.installmentId], references: [loanInstallments.id] }),
  account: one(accounts, { fields: [loanPayments.accountId], references: [accounts.id] }),
  transaction: one(transactions, { fields: [loanPayments.transactionId], references: [transactions.id] }),
}));

export const insertLoanPaymentSchema = createInsertSchema(loanPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().min(1, "Payment amount is required"),
  principalPaid: z.string().optional(),
  interestPaid: z.string().optional(),
  paymentType: z.enum(["emi", "prepayment", "partial"]).optional(),
  paymentDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
});

export type InsertLoanPayment = z.infer<typeof insertLoanPaymentSchema>;
export type LoanPayment = typeof loanPayments.$inferSelect;

// Extended transaction type with relations
export type TransactionWithRelations = Transaction & {
  account?: Account | null;
  category?: Category | null;
};

// Extended loan type with relations
export type LoanWithRelations = Loan & {
  account?: Account | null;
  installments?: LoanInstallment[];
  components?: LoanComponent[];
  terms?: LoanTerm[];
  payments?: LoanPayment[];
};

// Dashboard analytics types
export type DashboardStats = {
  totalSpentToday: number;
  totalSpentMonth: number;
  monthlyExpensesByCategory: { categoryId: number; categoryName: string; total: number; color: string }[];
  budgetUsage: { categoryId: number; categoryName: string; spent: number; budget: number; percentage: number }[];
  nextScheduledPayment: ScheduledPayment | null;
  lastTransactions: TransactionWithRelations[];
  upcomingBills: ScheduledPayment[];
  totalLoans?: number;
  totalEmiThisMonth?: number;
  nextEmiDue?: { loanName: string; amount: string; dueDate: string } | null;
};
