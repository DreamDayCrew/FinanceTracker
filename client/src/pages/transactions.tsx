import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TransactionWithRelations, Category } from "@shared/schema";

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
    year: 'numeric',
  });
}

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const { toast } = useToast();

  const { data: transactions = [], isLoading } = useQuery<TransactionWithRelations[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Transaction deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete transaction", variant: "destructive" });
    },
  });

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery || 
      tx.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
      tx.categoryId?.toString() === selectedCategory;
    
    let matchesDate = true;
    if (dateRange !== "all") {
      const txDate = new Date(tx.transactionDate);
      const now = new Date();
      if (dateRange === "today") {
        matchesDate = txDate.toDateString() === now.toDateString();
      } else if (dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = txDate >= weekAgo;
      } else if (dateRange === "month") {
        matchesDate = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
    const date = formatDate(tx.transactionDate);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, TransactionWithRelations[]>);

  const hasFilters = searchQuery || selectedCategory !== "all" || dateRange !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setDateRange("all");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-semibold text-foreground" data-testid="text-transactions-title">Transactions</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transactions..."
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="flex-1" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="flex-1" data-testid="select-date-filter">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button size="icon" variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground" data-testid="text-results-count">
        {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
      </p>

      {/* Transaction list */}
      {Object.keys(groupedTransactions).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <Card key={tx.id} data-testid={`card-transaction-${tx.id}`}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {tx.type === 'credit' ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {tx.merchant || tx.description || 'Transaction'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category?.name || 'Uncategorized'}
                          {tx.account?.name ? ` • ${tx.account.name}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                        </p>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(tx.id)}
                          data-testid={`button-delete-tx-${tx.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No transactions found</p>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
