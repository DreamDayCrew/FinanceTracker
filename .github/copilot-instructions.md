# Finance Tracker - AI Agent Instructions

## Architecture Overview

This is a **monorepo personal finance tracker** with three distinct applications sharing a common backend:

- **`client/`** - React web app (Vite + Wouter + TanStack Query + shadcn/ui)
- **`mobile/`** - React Native app (Expo SDK 50 + React Navigation + TanStack Query)
- **`server/`** - Express.js REST API with Drizzle ORM + PostgreSQL (Neon)
- **`shared/`** - Shared schema definitions (Drizzle + Zod validation)

### Critical Data Flow Pattern
All applications follow this architecture:
1. **Schema-first design**: Database schema + validation in `shared/schema.ts` using Drizzle + Zod
2. **Storage layer**: `server/storage.ts` provides typed interfaces (IStorage) for all DB operations
3. **REST endpoints**: `server/routes.ts` validates with Zod schemas, calls storage methods
4. **Client queries**: Both web/mobile use TanStack Query with `queryKey: ["/api/endpoint"]` convention

## Critical Developer Workflows

### Database Migrations
```bash
# After modifying shared/schema.ts:
npm run db:push  # Push schema changes to Neon database (no migration files needed for dev)
```
**Note**: Uses `drizzle-kit push` for rapid development. Migration files in `migrations/` are generated but not required for local dev.

### Development Servers
```bash
# Root (runs both server + client):
npm run dev  # Server on :5000, client Vite dev server

# Mobile (from mobile/ directory):
cd mobile && npm start  # Expo dev server
npm run build:apk      # EAS build for Android APK (preview profile)
npm run build:aab      # EAS build for Play Store AAB (production profile)
```

**Mobile API Configuration**: Mobile app requires `.env` file in `mobile/` with:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000  # Use machine IP, NOT localhost
```
See `mobile/eas.json` for production build config with hardcoded production API URL.

### Running Commands
- **Web client**: Run from project root (Vite dev server handles client/)
- **Server**: Run from project root (tsx watches server/)
- **Mobile**: ALWAYS `cd mobile/` first, then run Expo commands
- **Database**: Run from root (drizzle-kit uses root config)

## Project-Specific Conventions

### Schema & Validation Pattern
Every entity follows this pattern (see `shared/schema.ts`):
```typescript
// 1. Drizzle table definition
export const entityName = pgTable("entity_name", { ... });

// 2. Zod validation schema (omits id, timestamps)
export const insertEntitySchema = createInsertSchema(entityName).omit({
  id: true, createdAt: true, updatedAt: true
}).extend({ /* custom validations */ });

// 3. TypeScript types
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Entity = typeof entityName.$inferSelect;
```

### Storage Layer Pattern
`server/storage.ts` is the ONLY place that directly queries the database. All route handlers call storage methods:
```typescript
// ✅ Correct - routes.ts calls storage
app.post("/api/accounts", async (req, res) => {
  const validated = insertAccountSchema.parse(req.body);
  const account = await storage.createAccount(validated);
  res.json(account);
});

// ❌ Wrong - never query db directly in routes
// Don't: await db.select().from(accounts)...
```

### TanStack Query Convention
Both web and mobile use identical query keys matching API endpoints:
```typescript
// Query keys always match the API path
useQuery({ queryKey: ['/api/accounts'] })  // GET /api/accounts
useQuery({ queryKey: ['/api/dashboard'] }) // GET /api/dashboard

// Mutations invalidate by endpoint path
useMutation({
  mutationFn: (data) => fetch('/api/accounts', { method: 'POST', ... }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] })
})
```

### Design System (See `design_guidelines.md`)
- **Mobile-first**: All UI optimized for single-thumb operation
- **Typography**: Inter font, specific scales for amounts (32px/bold for totals, 18px/semibold for lists)
- **Spacing**: Tailwind units (p-4 mobile, p-6 tablet+, space-y-6 sections)
- **Navigation**: Bottom tabs (4 tabs: Dashboard/Transactions/Budgets/More) + FAB for quick add
- **Color system**: Category-specific colors (see `DEFAULT_CATEGORIES` in schema.ts)

### Special Features to Know

**1. Salary Management** (`server/salaryUtils.ts`):
- Complex payday calculation logic (last working day, nth weekday, fixed day with weekend adjustment)
- Used for monthly cycle tracking and scheduled payment generation

**2. OpenAI Integration** (`server/openai.ts`):
- SMS parsing for transaction extraction
- Category suggestion based on merchant/description

**3. Transaction Relationships**:
- `accountId` = source account
- `toAccountId` = destination (for transfers only)
- `paymentOccurrenceId` = links to scheduled payment occurrence
- `savingsContributionId` = links to savings goal contribution

**4. Account Balance Management**:
- Balance updates happen through `storage.updateAccountBalance()` with add/subtract operations
- Transfers affect both `accountId` and `toAccountId` balances

## Mobile-Specific Patterns

### File Structure
- `mobile/src/screens/` - Full page components (DashboardScreen.tsx, etc.)
- `mobile/src/components/` - Reusable components
- `mobile/src/lib/api.ts` - API client wrapper using fetch with EXPO_PUBLIC_API_URL
- `mobile/App.tsx` - Root navigation setup (Bottom Tabs + Stack navigators)

### Navigation Pattern
```typescript
// Bottom tabs defined in App.tsx
<Tab.Navigator> {/* Dashboard, Transactions, Budgets, More */}

// Stack navigation for detail screens
navigation.navigate('AddTransaction', { accountId: 123 })
```

### Platform-Specific Notes
- Android build via EAS (no Android Studio needed)
- Uses Expo managed workflow (no native code in repo except android/ generated files)
- Icons via `@expo/vector-icons` (Ionicons)

## Key Integration Points

### CORS Configuration (`server/index.ts`)
- Development: Allows ALL origins for mobile testing
- Production: Whitelisted origins only (localhost ports + deployed domains)
- Mobile app sends no origin header (treated as allowed)

### Environment Variables
- **Root**: `DATABASE_URL` (required for Drizzle/Neon connection)
- **Mobile**: `EXPO_PUBLIC_API_URL` (required for API calls, must be machine IP for physical devices)

## Common Gotchas

1. **Mobile local testing**: Use machine's local IP (192.168.x.x), not localhost
2. **Schema changes**: Always run `npm run db:push` after modifying `shared/schema.ts`
3. **Query invalidation**: Match the exact API path as queryKey string
4. **Mobile builds**: Run from `mobile/` directory, not root
5. **Storage layer**: Never bypass - all DB queries must go through `server/storage.ts` methods
6. **Decimal fields**: Always stored as strings in Drizzle (e.g., `decimal("amount", { precision: 12, scale: 2 })`)

## File References for Patterns

- **Schema example**: [shared/schema.ts](shared/schema.ts) - See `accounts` table + `insertAccountSchema`
- **Storage pattern**: [server/storage.ts](server/storage.ts#L1-L50) - IStorage interface
- **Route handler**: [server/routes.ts](server/routes.ts#L32-L90) - Accounts CRUD endpoints
- **Web query pattern**: [client/src/pages/transactions.tsx](client/src/pages/transactions.tsx) - useQuery + useMutation
- **Mobile query pattern**: [mobile/src/screens/DashboardScreen.tsx](mobile/src/screens/DashboardScreen.tsx) - Same TanStack Query usage
- **Design tokens**: [design_guidelines.md](design_guidelines.md) - Complete UI specifications
