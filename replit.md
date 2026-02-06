# Personal Finance Tracker - AI-Powered PWA

## Overview

The Personal Finance Tracker is an AI-powered Progressive Web App (PWA) designed for Android devices to provide comprehensive personal finance management. Its core purpose is to help users track transactions, manage multiple accounts, set budgets, schedule payments, and gain insights into spending patterns. The application leverages AI for features like SMS parsing for automatic transaction detection and categorization, aiming to simplify financial tracking for the user.

## User Preferences

- Currency: Indian Rupee (₹) only
- Platform: Android-focused PWA
- Design: Mobile-first with green theme
- AI Features: Category suggestions and SMS parsing with fallback logic

## System Architecture

The application is built as a PWA and a React Native mobile app, supported by an Express.js backend and a PostgreSQL database.

**UI/UX Decisions:**
- **Frontend:** React 18 with TypeScript, Wouter for routing, TanStack Query for data fetching, Tailwind CSS with Shadcn UI components for a custom design system, and Lucide React for icons.
- **Mobile:** React Native with Expo SDK 50, React Navigation for navigation, and TypeScript.
- **Design System:** Mobile-first responsive design, green primary color (#16a34a), bottom navigation, Floating Action Button (FAB) for quick actions, and dark/light theme support.
- **Core Features:**
    - **Multi-Account Management:** Track bank accounts and credit cards with balance and limit displays.
    - **Transaction Management:** Add income/expense, AI-powered category suggestions, SMS parsing, search, filter, and account linking.
    - **Budget Tracking:** Monthly category budgets with visual progress indicators and color-coded alerts.
    - **Scheduled Payments:** Recurring payment reminders with due dates and status toggles.
    - **Dashboard & Insights:** Daily/monthly spending summaries, category breakdowns, upcoming payments, and Next Month Financial Plan showing projected salary income, scheduled bills, loan EMIs, and insurance premiums.
    - **Security Features:** 4-digit PIN lock and biometric authentication.
    - **Data Export:** Transactions exportable to CSV and JSON.
    - **Insurance Tracking:** Manage multiple insurance policies, track premium payments, and auto-generate installments.
    - **Loan Management:** Track various loan types, including principal, interest, EMI, and payment history. Supports pre-closure and top-up functionalities.

**Technical Implementations:**
- **Frontend:** React Hook Form with Zod validation.
- **Backend:** Express.js, TypeScript, and Zod for request validation.
- **Database:** PostgreSQL with Drizzle ORM for type-safe queries, including automatic default category seeding.

## External Dependencies

- **OpenAI API:** Integrated for AI-powered category suggestions and SMS parsing.
- **PostgreSQL:** Primary database for persistent storage, compatible with Neon.
- **TanStack Query (React Query v5):** Used for data fetching and caching in both frontend applications.
- **Shadcn UI:** Component library providing pre-built, accessible UI components.
- **Lucide React:** Icon library for visual elements.
- **Wouter:** Lightweight routing library for the React PWA.
- **React Navigation:** Routing solution for the React Native mobile app.
- **Expo SDK:** Framework for building universal React Native apps.
- **react-native-gesture-handler:** Used for swipeable functionality in the mobile app.