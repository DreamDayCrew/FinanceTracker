import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingDown, 
  Calendar, 
  Receipt,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, TransactionWithRelations, ScheduledPayment } from "@shared/schema";

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

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
        <span className="text-sm text-muted-foreground">{currentMonth}</span>
      </div>

      <Card data-testid="card-today-spending">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Spent Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground" data-testid="text-today-amount">
            {formatCurrency(stats?.totalSpentToday || 0)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This month: {formatCurrency(stats?.totalSpentMonth || 0)}
          </p>
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
                <p className="text-xs text-muted-foreground">
                  Due on {stats.nextScheduledPayment.dueDate}th of this month
                </p>
              </div>
              <p className="text-lg font-semibold text-destructive">
                {formatCurrency(parseFloat(stats.nextScheduledPayment.amount))}
              </p>
            </div>
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
                  <span className="text-sm">{bill.name}</span>
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
