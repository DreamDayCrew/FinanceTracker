import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingDown, 
  Calendar, 
  Receipt,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Target
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, TransactionWithRelations, ScheduledPayment, SavingsGoal } from "@shared/schema";

interface LoanSummary {
  totalLoans: number;
  totalOutstanding: number;
  totalEmiThisMonth: number;
  nextEmiDue: {
    loanName: string;
    amount: string;
    dueDate: string;
  } | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const { data: loanSummary } = useQuery<LoanSummary>({
    queryKey: ["/api/loan-summary"],
  });

  const { data: savingsGoals } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
  });

  const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Calculate savings summary
  const activeGoals = savingsGoals?.filter(g => g.status === 'active') || [];
  const totalSavings = activeGoals.reduce((acc, goal) => acc + parseFloat(goal.currentAmount || "0"), 0);
  const monthlyExpectedSavings = activeGoals.reduce((acc, goal) => acc + parseFloat(goal.monthlyExpectedAmount || "0"), 0);
  // For "how much we saved this month", we would ideally have this in stats, but we can approximate or show 0 if not available
  const savedThisMonth = 0; // This should ideally come from backend stats

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
        <span className="text-sm text-muted-foreground">{currentMonth}</span>
      </div>

      <Card data-testid="card-cycle-overview">
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="savings">Savings</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="p-4 pt-2 space-y-4">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4" />
                  Spent Today
                </CardTitle>
                <p className="text-3xl font-bold text-foreground" data-testid="text-today-amount">
                  {formatCurrency(stats?.totalSpentToday || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This month: {formatCurrency(stats?.totalSpentMonth || 0)}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="savings" className="p-4 pt-2 space-y-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Total</span>
                  <span className="text-sm font-bold">{formatCurrency(totalSavings)}</span>
                </div>
                <div className="flex flex-col border-l pl-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Expected</span>
                  <span className="text-sm font-bold">{formatCurrency(monthlyExpectedSavings)}</span>
                </div>
                <div className="flex flex-col border-l pl-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Saved</span>
                  <span className="text-sm font-bold text-primary">{formatCurrency(savedThisMonth)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Active Goals</h3>
                {activeGoals.length > 0 ? (
                  activeGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Target className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium truncate">{goal.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(parseFloat(goal.currentAmount || "0"))} / {formatCurrency(parseFloat(goal.targetAmount))}
                          </span>
                        </div>
                        <Progress value={(parseFloat(goal.currentAmount || "0") / parseFloat(goal.targetAmount)) * 100} className="h-1.5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No active savings goals</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card data-testid="card-category-breakdown">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Expenses by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.monthlyExpensesByCategory && stats.monthlyExpensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {stats.monthlyExpensesByCategory.slice(0, 5).map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{cat.categoryName}</span>
                      <span className="text-sm text-muted-foreground">{formatCurrency(cat.total)}</span>
                    </div>
                    <Progress 
                      value={(cat.total / (stats.totalSpentMonth || 1)) * 100} 
                      className="h-1.5 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expenses this month
            </p>
          )}
        </CardContent>
      </Card>

      {stats?.budgetUsage && stats.budgetUsage.length > 0 && (
        <Card data-testid="card-budget-tracking">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Tracking
            </CardTitle>
            <Link href="/budgets" className="text-xs text-primary">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.budgetUsage.slice(0, 3).map((budget) => {
                const isOverBudget = budget.percentage > 100;
                const isNearLimit = budget.percentage >= 80 && budget.percentage <= 100;
                
                return (
                  <div key={budget.categoryId}>
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span className="text-sm font-medium">{budget.categoryName}</span>
                      <span className={`text-xs ${isOverBudget ? 'text-destructive' : isNearLimit ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage, 100)} 
                      className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.creditCardSpending && stats.creditCardSpending.length > 0 && (
        <Card data-testid="card-credit-card-spending">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Credit Card Spending
            </CardTitle>
            <Link href="/accounts" className="text-xs text-primary">Manage</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.creditCardSpending.map((card) => {
                const hasLimit = card.limit !== null && card.limit > 0;
                const isOverLimit = hasLimit && card.percentage > 100;
                const isNearLimit = hasLimit && card.percentage >= 80 && card.percentage <= 100;
                
                return (
                  <div key={card.accountId}>
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{card.accountName}</span>
                        {card.bankName && (
                          <span className="text-xs text-muted-foreground">{card.bankName}</span>
                        )}
                      </div>
                      <div className="text-right">
                        {hasLimit ? (
                          <span className={`text-xs font-medium ${isOverLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {formatCurrency(card.spent)} / {formatCurrency(card.limit)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(card.spent)}
                          </span>
                        )}
                      </div>
                    </div>
                    {hasLimit && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all" 
                            style={{ 
                              width: `${Math.min(card.percentage, 100)}%`,
                              backgroundColor: card.color
                            }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isOverLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-600' : 'text-green-600'}`}>
                          {card.percentage}%
                        </span>
                      </div>
                    )}
                    {!hasLimit && (
                      <p className="text-xs text-muted-foreground">No limit set</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.nextScheduledPayment && (
        <Card data-testid="card-next-payment">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Scheduled Payment
            </CardTitle>
            <Link href="/scheduled-payments" className="text-xs text-primary">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{stats.nextScheduledPayment.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Due on {stats.nextScheduledPayment.dueDate}th
                  </p>
                  <Badge variant={stats.nextScheduledPayment.status === 'paid' ? 'default' : 'secondary'} className="text-[10px] h-4">
                    {stats.nextScheduledPayment.status === 'paid' ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              </div>
              <p className="text-lg font-semibold text-destructive">
                {formatCurrency(parseFloat(stats.nextScheduledPayment.amount))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loanSummary && loanSummary.totalLoans > 0 && (
        <Card data-testid="card-loan-summary">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="w-4 h-4" />
              Loans & EMI
            </CardTitle>
            <Link href="/loans" className="text-xs text-primary">Manage</Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold" data-testid="text-loan-outstanding">
                  {formatCurrency(loanSummary.totalOutstanding)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly EMI</p>
                <p className="text-lg font-semibold text-destructive" data-testid="text-loan-emi">
                  {formatCurrency(loanSummary.totalEmiThisMonth)}
                </p>
              </div>
            </div>
            {loanSummary.nextEmiDue && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Next EMI due: {new Date(loanSummary.nextEmiDue.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} 
                <span className="ml-1">({loanSummary.nextEmiDue.loanName})</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {loanSummary.totalLoans} active loan{loanSummary.totalLoans !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {stats?.upcomingBills && stats.upcomingBills.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" data-testid="card-upcoming-bills">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Bills Due Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.upcomingBills.map((bill: ScheduledPayment) => (
                <div key={bill.id} className="flex justify-between items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm">{bill.name}</span>
                    <Badge variant="secondary" className="text-[10px] w-fit h-4 px-1">Pending</Badge>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(parseFloat(bill.amount))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-recent-transactions">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Recent Transactions
          </CardTitle>
          <Link href="/transactions" className="text-xs text-primary">View All</Link>
        </CardHeader>
        <CardContent>
          {stats?.lastTransactions && stats.lastTransactions.length > 0 ? (
            <div className="space-y-3">
              {stats.lastTransactions.map((tx: TransactionWithRelations) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {tx.type === 'credit' ? (
                      <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.merchant || tx.description || tx.category?.name || 'Transaction'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.transactionDate)} {tx.category?.name ? `• ${tx.category.name}` : ''}
                    </p>
                  </div>
                  <p className={`text-sm font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transactions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
