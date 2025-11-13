import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Wallet, Calendar, PieChart } from "lucide-react";
import type { Expense, Budget } from "@shared/schema";

export default function Dashboard() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: [`/api/budgets?month=${currentMonth}&year=${currentYear}`],
  });

  // Calculate totals
  const thisMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() + 1 === currentMonth && expDate.getFullYear() === currentYear;
  });

  const totalSpent = thisMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  const lastMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    return expDate.getMonth() + 1 === lastMonth && expDate.getFullYear() === lastMonthYear;
  });

  const lastMonthTotal = lastMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const percentChange = lastMonthTotal > 0 ? ((totalSpent - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  // Category breakdown
  const categoryTotals = thisMonthExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const budgetUsagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      "Groceries": "shopping_cart",
      "Transport": "directions_car",
      "Dining": "restaurant",
      "Shopping": "shopping_bag",
      "Entertainment": "movie",
      "Bills": "receipt",
      "Health": "local_hospital",
      "Education": "school",
      "Travel": "flight",
      "Other": "category",
    };
    return icons[category] || "category";
  };

  if (expensesLoading || budgetsLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 pb-24">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="text-current-month">
          {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Total Spending Card */}
      <Card className="overflow-hidden" data-testid="card-total-spending">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Total Spending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-foreground" data-testid="text-total-spent">
            {formatCurrency(totalSpent)}
          </div>
          <div className="flex items-center gap-2">
            {percentChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-destructive" />
            ) : percentChange < 0 ? (
              <TrendingDown className="w-4 h-4 text-primary" />
            ) : (
              <div className="w-4 h-4" />
            )}
            <span className={`text-sm font-medium ${percentChange > 0 ? 'text-destructive' : percentChange < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {percentChange !== 0 ? `${Math.abs(percentChange).toFixed(1)}%` : 'No change'}
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
          {totalBudget > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget Usage</span>
                <span className="font-medium">{budgetUsagePercent.toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(budgetUsagePercent, 100)} 
                className={`h-2 ${budgetUsagePercent > 100 ? 'bg-destructive/20' : budgetUsagePercent > 80 ? 'bg-yellow-500/20' : 'bg-primary/20'}`}
                data-testid="progress-budget-usage"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card data-testid="card-top-categories">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Top Spending Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                <span className="material-icons text-muted-foreground text-3xl">bar_chart</span>
              </div>
              <p className="text-sm text-muted-foreground">No expenses yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first expense to see insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topCategories.map(([category, amount]) => {
                const budget = budgets.find(b => b.category === category);
                const budgetAmount = budget ? parseFloat(budget.amount) : 0;
                const percentage = budgetAmount > 0 ? (amount / budgetAmount) * 100 : 0;
                
                return (
                  <div key={category} className="space-y-2" data-testid={`category-item-${category}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-icons text-primary text-xl">
                            {getCategoryIcon(category)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{category}</p>
                          {budget && (
                            <p className="text-xs text-muted-foreground">
                              of {formatCurrency(budgetAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</p>
                        {budget && (
                          <p className={`text-xs font-medium ${percentage > 100 ? 'text-destructive' : percentage > 80 ? 'text-yellow-600' : 'text-primary'}`}>
                            {percentage.toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                    {budget && (
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={`h-1.5 ${percentage > 100 ? 'bg-destructive/20' : percentage > 80 ? 'bg-yellow-500/20' : 'bg-primary/20'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions Preview */}
      <Card data-testid="card-recent-transactions">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {thisMonthExpenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                <span className="material-icons text-muted-foreground text-3xl">receipt_long</span>
              </div>
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start tracking your expenses</p>
            </div>
          ) : (
            <div className="space-y-3">
              {thisMonthExpenses.slice(0, 5).map((expense) => (
                <div 
                  key={expense.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover-elevate border border-border"
                  data-testid={`transaction-item-${expense.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-icons text-primary text-lg">
                        {getCategoryIcon(expense.category)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{expense.category}</p>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(parseFloat(expense.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
