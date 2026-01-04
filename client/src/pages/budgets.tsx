import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, PieChart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Budget, Category, TransactionWithRelations } from "@shared/schema";

interface BudgetSummary {
  month: number;
  year: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  categories: {
    budgetId: number;
    categoryId: number;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentage: number;
  }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Budgets() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    month: selectedMonth,
    year: selectedYear,
  });

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ["/api/budgets", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/budgets?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch budgets");
      return res.json();
    },
  });

  const { data: budgetSummary } = useQuery<BudgetSummary>({
    queryKey: ["/api/budget-summary", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/budget-summary?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch budget summary");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: transactions = [] } = useQuery<TransactionWithRelations[]>({
    queryKey: ["/api/transactions"],
  });

  const monthlySpending = transactions
    .filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return tx.type === 'debit' && 
        txDate.getMonth() + 1 === selectedMonth && 
        txDate.getFullYear() === selectedYear;
    })
    .reduce((acc, tx) => {
      const catId = tx.categoryId || 0;
      acc[catId] = (acc[catId] || 0) + parseFloat(tx.amount);
      return acc;
    }, {} as Record<number, number>);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/budgets", {
        ...data,
        categoryId: parseInt(data.categoryId),
        month: selectedMonth,
        year: selectedYear,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-summary", selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsDialogOpen(false);
      setFormData({ categoryId: "", amount: "", month: selectedMonth, year: selectedYear });
      toast({ title: "Budget created" });
    },
    onError: () => {
      toast({ title: "Failed to create budget", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-summary", selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Budget deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete budget", variant: "destructive" });
    },
  });

  const expenseCategories = categories.filter(c => c.type === "expense");
  const existingCategoryIds = budgets.map(b => b.categoryId);
  const availableCategories = expenseCategories.filter(c => !existingCategoryIds.includes(c.id));

  const totalBudget = budgetSummary?.totalBudget || 0;
  const totalSpent = budgetSummary?.totalSpent || 0;
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/more")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Budget Planner</h1>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableCategories.length === 0} data-testid="button-add-budget">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget</DialogTitle>
              <DialogDescription>Set a spending limit for a category</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger data-testid="select-budget-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget Amount (INR)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g., 5000"
                  data-testid="input-budget-amount"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-budget">
                {createMutation.isPending ? "Saving..." : "Save Budget"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h2>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {budgets.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <PieChart className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-90">Total Budget</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Spent: {formatCurrency(totalSpent)}</span>
                <span>Remaining: {formatCurrency(totalBudget - totalSpent)}</span>
              </div>
              <Progress value={Math.min(overallPercentage, 100)} className="h-2 bg-white/30" />
              <p className="text-xs mt-1 opacity-75">{overallPercentage}% of budget used</p>
            </CardContent>
          </Card>
        )}

        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const category = categories.find(c => c.id === budget.categoryId);
            const spent = monthlySpending[budget.categoryId || 0] || 0;
            const budgetAmount = parseFloat(budget.amount);
            const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
            const isOverBudget = percentage > 100;
            const isNearLimit = percentage >= 80 && percentage <= 100;

            return (
              <Card key={budget.id} data-testid={`card-budget-${budget.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category?.color || '#9E9E9E' }}
                      />
                      <span className="font-medium">{category?.name || 'Unknown'}</span>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(budget.id)}
                      data-testid={`button-delete-budget-${budget.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className={`text-sm ${isOverBudget ? 'text-destructive' : isNearLimit ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {formatCurrency(spent)} spent
                    </span>
                    <span className="text-sm text-muted-foreground">
                      of {formatCurrency(budgetAmount)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
                  />
                  <p className={`text-xs mt-1 ${isOverBudget ? 'text-destructive' : isNearLimit ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {percentage}% used {isOverBudget && '- Over budget!'}
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No budgets set for this month</p>
              <Button onClick={() => setIsDialogOpen(true)} disabled={availableCategories.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
