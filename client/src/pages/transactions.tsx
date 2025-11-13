import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { EXPENSE_CATEGORIES, type Expense } from "@shared/schema";
import { TransactionItem } from "@/components/transaction-item";

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  // Sort by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Filter expenses
  const filteredExpenses = sortedExpenses.filter(expense => {
    const matchesSearch = !searchQuery || 
      expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.description && expense.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    
    let matchesMonth = true;
    if (selectedMonth !== "all") {
      const expenseDate = new Date(expense.date);
      const [year, month] = selectedMonth.split("-");
      matchesMonth = expenseDate.getFullYear() === parseInt(year) && 
                     expenseDate.getMonth() + 1 === parseInt(month);
    }
    
    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Group by date
  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    const date = new Date(expense.date).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  // Get unique months from expenses
  const availableMonths = Array.from(new Set(expenses.map(exp => {
    const date = new Date(exp.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }))).sort().reverse();

  const hasFilters = searchQuery || selectedCategory !== "all" || selectedMonth !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedMonth("all");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <div className="h-10 bg-muted animate-pulse rounded-lg" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 flex-1 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-transactions-title">
          Transactions
        </h1>
        {hasFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="gap-2"
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-category-filter">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Category" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-month-filter">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map(month => {
              const [year, monthNum] = month.split("-");
              const date = new Date(parseInt(year), parseInt(monthNum) - 1);
              return (
                <SelectItem key={month} value={month}>
                  {date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground" data-testid="text-results-count">
        {filteredExpenses.length} {filteredExpenses.length === 1 ? 'transaction' : 'transactions'}
      </div>

      {/* Transaction List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="material-icons text-muted-foreground text-4xl">receipt_long</span>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {expenses.length === 0 ? "No transactions yet" : "No matching transactions"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {expenses.length === 0 
              ? "Add your first expense to start tracking" 
              : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide sticky top-0 bg-background py-2 z-10">
                {date}
              </h3>
              <div className="space-y-2">
                {dateExpenses.map(expense => (
                  <TransactionItem key={expense.id} expense={expense} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
