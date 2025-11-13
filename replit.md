# FinArt - AI-Powered Expense Tracker

A mobile-first web application clone of the FinArt expense tracker app, built with React, Express, and OpenAI integration.

## Project Overview

FinArt is a comprehensive expense tracking application designed specifically for mobile devices (Android focus) with a beautiful, intuitive interface. It helps users track expenses, manage budgets, set bill reminders, and gain insights into their spending patterns using AI-powered categorization.

## Key Features

### 1. Expense Management
- Add expenses with amount, category, description, and date
- AI-powered automatic category suggestions using OpenAI GPT-5
- Fallback keyword-based categorization for reliability
- View all transactions with filtering and search capabilities
- Delete expenses with confirmation dialog

### 2. Budget Tracking
- Set monthly budgets per category
- Visual progress indicators showing spending vs budget
- Color-coded alerts (green < 80%, yellow 80-100%, red > 100%)
- Track budget usage across all categories
- Month-specific budget management

### 3. Bill & Subscription Reminders
- Add recurring bills with due dates
- Visual alerts for upcoming bills (7-day window)
- Category-based bill organization
- Due date tracking with day-of-month settings

### 4. Dashboard & Insights
- Total monthly spending overview
- Top spending categories with visual breakdown
- Budget usage progress tracking
- Recent transactions preview
- Month-over-month spending comparison

### 5. Data Export
- Export expenses to CSV format
- Export to PDF-like text format
- Downloadable reports for backup and analysis

## Technical Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for lightweight routing
- **TanStack Query (React Query)** for data fetching and state management
- **Tailwind CSS** with custom design system
- **Shadcn UI** components library
- **Lucide React** icons + Material Icons
- **React Hook Form** with Zod validation
- **Mobile-first responsive design**

### Backend
- **Express.js** server
- **In-memory storage** (MemStorage) for MVP
- **OpenAI API** integration for AI categorization
- **Zod** for request validation
- **TypeScript** for type safety

### Design System
- FinArt-inspired green color scheme (#16a34a primary)
- Material Design principles
- Mobile-first approach with safe-area support
- Custom elevation system for interactions
- Indian Rupee (₹) currency formatting

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn UI components
│   │   │   ├── bottom-nav.tsx   # Bottom navigation bar
│   │   │   ├── fab-button.tsx   # Floating action button
│   │   │   └── transaction-item.tsx  # Transaction list item
│   │   ├── pages/
│   │   │   ├── dashboard.tsx    # Main dashboard
│   │   │   ├── transactions.tsx # Transaction list with filters
│   │   │   ├── add-expense.tsx  # Add expense form
│   │   │   ├── budgets.tsx      # Budget management
│   │   │   ├── bills.tsx        # Bill reminders
│   │   │   └── more.tsx         # Settings & export
│   │   ├── lib/
│   │   │   └── queryClient.ts   # TanStack Query setup
│   │   ├── App.tsx              # Main app with routing
│   │   └── index.css            # Global styles
│   └── index.html
├── server/
│   ├── routes.ts                # API endpoints
│   ├── storage.ts               # In-memory data storage
│   ├── openai.ts                # AI categorization
│   └── index.ts                 # Express server
├── shared/
│   └── schema.ts                # Shared TypeScript types & Zod schemas
└── design_guidelines.md         # Design system documentation
```

## API Endpoints

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create new expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/suggest-category` - AI category suggestion

### Budgets
- `GET /api/budgets?month=X&year=Y` - Get budgets for specific month
- `POST /api/budgets` - Create new budget
- `DELETE /api/budgets/:id` - Delete budget

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create new bill
- `DELETE /api/bills/:id` - Delete bill

### Export
- `POST /api/export` - Export data (format: csv or pdf)

## Environment Variables

Required secrets:
- `OPENAI_API_KEY` - OpenAI API key for AI categorization
- `SESSION_SECRET` - Session secret for Express (auto-generated)

## Data Model

### Expense
- `id` - Unique identifier
- `amount` - Decimal (INR)
- `category` - String (Groceries, Transport, Dining, etc.)
- `description` - Optional text
- `date` - Timestamp
- `createdAt` - Timestamp

### Budget
- `id` - Unique identifier
- `category` - String
- `amount` - Decimal (INR)
- `month` - Integer (1-12)
- `year` - Integer
- `createdAt` - Timestamp

### Bill
- `id` - Unique identifier
- `name` - String
- `amount` - Decimal (INR)
- `dueDate` - Integer (1-31, day of month)
- `category` - String
- `isRecurring` - Boolean (1 or 0)
- `createdAt` - Timestamp

## Categories

Available expense categories:
- Groceries
- Transport
- Dining
- Shopping
- Entertainment
- Bills
- Health
- Education
- Travel
- Other

## Mobile-First Design Features

- Bottom navigation bar with safe-area support
- Floating Action Button (FAB) for quick expense entry
- Touch-optimized UI with 48px minimum tap targets
- Responsive grid layouts
- Empty states with helpful messaging
- Loading skeletons for better UX
- Material Icons for category representation
- Swipe-friendly interaction patterns

## Recent Changes

- **2024-11**: Initial MVP implementation
  - Complete frontend with all pages and components
  - Backend API with OpenAI integration
  - Mobile-first responsive design
  - Data export functionality
  - Safe-area support for modern Android devices

## User Preferences

- Currency: Indian Rupee (₹) only
- Platform: Android-focused (iOS not required)
- Design: Clean, modern, mobile-first with FinArt-inspired green theme
- AI Features: Category suggestions with fallback logic

## Known Limitations

- Data stored in memory (resets on server restart)
- OpenAI rate limiting may cause fallback to keyword-based categorization
- Export generates text-based PDF (not actual PDF binary)
- Single-user application (no authentication)
- Month-specific budgets only (no custom date ranges)

## Future Enhancements

- Persistent database storage (PostgreSQL)
- User authentication and multi-user support
- Income tracking alongside expenses
- Custom budget periods
- Split expenses for shared costs
- Data import from bank statements
- Charts and graphs for spending trends
- PWA installation for offline support
- Push notifications for bill reminders
