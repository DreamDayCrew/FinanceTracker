# Personal Finance Tracker - AI-Powered PWA

A mobile-first Progressive Web App for personal finance management built with React, Express, and PostgreSQL. Features AI-powered SMS parsing for automatic transaction detection, multiple account management, budget tracking, and scheduled payment reminders.

## Project Overview

Personal Finance Tracker is a comprehensive expense tracking application designed specifically for Android devices with a modern, intuitive interface. It helps users track transactions, manage multiple bank accounts and credit cards, set budgets per category, schedule payment reminders, and gain insights into their spending patterns using AI-powered categorization.

## Key Features

### 1. Multi-Account Management
- Track multiple bank accounts and credit cards
- Display current balance for bank accounts
- Display credit limit and available credit for credit cards
- Account-specific transaction filtering

### 2. Transaction Management
- Add income and expense transactions
- AI-powered automatic category suggestions using OpenAI
- SMS parsing for automatic transaction detection
- View all transactions with search, category filter, and date range
- Account-linked transactions for accurate balance tracking

### 3. Budget Tracking
- Set monthly budgets per category
- Visual progress indicators showing spending vs budget
- Color-coded alerts (green < 80%, yellow 80-100%, red > 100%)
- Track budget usage across all expense categories
- Month-specific budget management

### 4. Scheduled Payments
- Create recurring payment reminders (rent, maid salary, subscriptions)
- Set due dates (day of month)
- Active/inactive status toggle
- Visual alerts for upcoming and past-due payments
- Total monthly recurring costs summary

### 5. Dashboard & Insights
- Total spent today and this month
- Monthly spending graph with category breakdown
- Budget usage progress for top categories
- Next upcoming scheduled payment
- Recent transactions preview (last 5)

### 6. Security Features
- 4-digit PIN lock with setup and remove
- Biometric authentication toggle (fingerprint)
- Settings persistence per user

### 7. Data Export
- Export transactions to CSV format
- Export transactions to JSON format
- Downloadable reports for backup and analysis

## Technical Stack

### Web Frontend (React PWA)
- **React 18** with TypeScript
- **Wouter** for lightweight routing
- **TanStack Query (React Query v5)** for data fetching and caching
- **Tailwind CSS** with custom design system
- **Shadcn UI** components library
- **Lucide React** icons
- **React Hook Form** with Zod validation
- **Mobile-first responsive design**
- **Dark/Light theme support**

### Mobile App (React Native)
- **React Native** with Expo SDK 50
- **React Navigation** (bottom tabs + stack)
- **TanStack Query** for data fetching
- **TypeScript** for type safety
- Located in `mobile/` folder
- See `mobile/README.md` for setup instructions

### Backend
- **Express.js** server
- **PostgreSQL** database with Drizzle ORM
- **OpenAI API** integration for category suggestions and SMS parsing
- **Zod** for request validation
- **TypeScript** for type safety

### Database
- **PostgreSQL** with Neon-compatible driver
- **Drizzle ORM** for type-safe queries
- Automatic default categories seeding

### Design System
- Green primary color (#16a34a)
- Mobile-first approach with safe-area support
- Bottom navigation with 4 main sections
- Floating Action Button for quick transaction entry
- Indian Rupee (₹) currency formatting

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn UI components
│   │   │   ├── bottom-nav.tsx   # Bottom navigation bar
│   │   │   └── fab-button.tsx   # Floating action button
│   │   ├── pages/
│   │   │   ├── dashboard.tsx    # Main dashboard with analytics
│   │   │   ├── accounts.tsx     # Bank accounts & credit cards
│   │   │   ├── transactions.tsx # Transaction list with filters
│   │   │   ├── add-transaction.tsx # Add transaction form
│   │   │   ├── budgets.tsx      # Budget management
│   │   │   ├── scheduled-payments.tsx # Scheduled payments
│   │   │   ├── settings.tsx     # Settings (theme, PIN, export)
│   │   │   └── more.tsx         # More options menu
│   │   ├── lib/
│   │   │   └── queryClient.ts   # TanStack Query setup
│   │   ├── App.tsx              # Main app with routing
│   │   └── index.css            # Global styles with theme
│   └── index.html
├── server/
│   ├── db.ts                    # Database connection
│   ├── routes.ts                # API endpoints
│   ├── storage.ts               # DatabaseStorage with all CRUD
│   ├── openai.ts                # AI categorization & SMS parsing
│   └── index.ts                 # Express server
├── shared/
│   └── schema.ts                # Drizzle schema & Zod types
└── design_guidelines.md         # Design system documentation
```

## API Endpoints

### Dashboard
- `GET /api/dashboard` - Get analytics (spending today, month, categories, budgets, upcoming payments)

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Create account
- `PATCH /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Transactions
- `GET /api/transactions` - Get all transactions with relations
- `POST /api/transactions` - Create transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category

### Budgets
- `GET /api/budgets?month=X&year=Y` - Get budgets for month/year
- `POST /api/budgets` - Create budget
- `DELETE /api/budgets/:id` - Delete budget

### Scheduled Payments
- `GET /api/scheduled-payments` - Get all scheduled payments
- `POST /api/scheduled-payments` - Create scheduled payment
- `PATCH /api/scheduled-payments/:id` - Update payment status
- `DELETE /api/scheduled-payments/:id` - Delete payment

### User Settings
- `GET /api/user` - Get current user
- `PATCH /api/user` - Update user settings
- `POST /api/user/set-pin` - Set 4-digit PIN
- `POST /api/user/reset-pin` - Remove PIN

### SMS & AI
- `POST /api/sms/parse` - Parse SMS for transaction data
- `POST /api/transactions/suggest-category` - Get AI category suggestion

### Export
- `POST /api/export` - Export data (format: csv or json)

## Database Schema

### users
- id, email (optional), pinHash (optional), biometricEnabled, theme, createdAt

### accounts
- id, userId, name, type (bank_account/credit_card), balance, creditLimit, accountNumber (last 4), createdAt

### categories
- id, userId, name, type (income/expense), icon, color, createdAt

### transactions
- id, userId, accountId, categoryId, type (credit/debit), amount, merchant, description, transactionDate, smsHash, createdAt

### budgets
- id, userId, categoryId, amount, month, year, createdAt

### scheduled_payments
- id, userId, categoryId, name, amount, dueDate (1-31), notes, status (active/inactive), createdAt

### sms_logs
- id, userId, rawMessage, parsedData, transactionId, processedAt

## Default Categories

Expense categories: Food & Dining, Groceries, Transport, Shopping, Entertainment, Bills & Utilities, Health, Education, Travel, Personal Care, Other

Income categories: Salary, Investment Returns, Freelance, Gift, Other Income

## Environment Variables

Required secrets:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SESSION_SECRET` - Session secret for Express

## User Preferences

- Currency: Indian Rupee (₹) only
- Platform: Android-focused PWA
- Design: Mobile-first with green theme
- AI Features: Category suggestions and SMS parsing with fallback logic

## Recent Changes

- **2024-12**: Complete rebuild with PostgreSQL
  - Migrated from in-memory to PostgreSQL database
  - Added multi-account support (bank + credit cards)
  - Implemented SMS parsing for auto-detection
  - Added scheduled payments with reminders
  - Added PIN and biometric security options
  - Redesigned all pages for mobile-first UX
  - Added dark/light theme support
  - Improved dashboard with spending analytics

## Navigation Structure

1. **Dashboard** (/) - Home with spending overview
2. **Accounts** (/accounts) - Bank accounts & credit cards
3. **Transactions** (/transactions) - Full transaction list
4. **FAB** - Quick add transaction
5. **More** (/more) - Menu with:
   - Plan Budget (/budgets)
   - Scheduled Payments (/scheduled-payments)
   - Settings (/settings)
   - Export Data
