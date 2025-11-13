import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, TrendingUp, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { insertBudgetSchema, EXPENSE_CATEGORIES, type Budget, type Expense, type InsertBudget } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Budgets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: [`/api/budgets?month=${currentMonth}&year=${currentYear}`],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const form = useForm<InsertBudget>({
    resolver: zodResolver(insertBudgetSchema),
    defaultValues: {
      category: "",
      amount: "",
      month: currentMonth,
      year: currentYear,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertBudget) => apiRequest("POST", "/api/budgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/budgets?month=${currentMonth}&year=${currentYear}`] });
      toast({
        title: "Budget created",
        description: "Your budget has been set successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/budgets?month=${currentMonth}&year=${currentYear}`] });
      toast({
        title: "Budget deleted",
        description: "Budget has been removed successfully",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBudget) => {
    createMutation.mutate(data);
  };

  // Calculate spending per category for current month
  const thisMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() + 1 === currentMonth && expDate.getFullYear() === currentYear;
  });

  const categorySpending = thisMonthExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
    return acc;
  }, {} as Record<string, number>);

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

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return { color: "text-destructive", icon: AlertCircle, label: "Over budget" };
    if (percentage >= 80) return { color: "text-yellow-600", icon: TrendingUp, label: "Almost there" };
    return { color: "text-primary", icon: CheckCircle2, label: "On track" };
  };

  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const totalSpent = Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0);

  if (budgetsLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-budgets-title">
            Budgets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-budget">
              <Plus className="w-4 h-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Set Budget</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.filter(cat => 
                            !budgets.find(b => b.category === cat)
                          ).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Budget</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            {...field}
                            type="number"
                            step="100"
                            placeholder="0"
                            className="pl-8"
                            data-testid="input-budget-amount"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMutation.isPending}
                    data-testid="button-save-budget"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Budget"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Summary */}
      {budgets.length > 0 && (
        <Card data-testid="card-budget-summary">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overall Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(totalSpent)}
              </span>
              <span className="text-sm text-muted-foreground">
                of {formatCurrency(totalBudget)}
              </span>
            </div>
            <Progress 
              value={Math.min((totalSpent / totalBudget) * 100, 100)} 
              className={`h-2 ${
                totalSpent > totalBudget ? 'bg-destructive/20' : 
                (totalSpent / totalBudget) > 0.8 ? 'bg-yellow-500/20' : 
                'bg-primary/20'
              }`}
            />
          </CardContent>
        </Card>
      )}

      {/* Budget List */}
      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="material-icons text-muted-foreground text-4xl">savings</span>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No budgets set</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Set budgets for different categories to track your spending
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const spent = categorySpending[budget.category] || 0;
            const budgetAmount = parseFloat(budget.amount);
            const percentage = (spent / budgetAmount) * 100;
            const status = getBudgetStatus(spent, budgetAmount);
            const StatusIcon = status.icon;

            return (
              <Card key={budget.id} className="overflow-hidden" data-testid={`budget-card-${budget.category}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-icons text-primary text-xl">
                          {getCategoryIcon(budget.category)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{budget.category}</p>
                        <p className="text-xs text-muted-foreground">{status.label}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(budget.id)}
                      data-testid={`button-delete-budget-${budget.category}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-foreground">{formatCurrency(spent)}</span>
                      <span className="text-muted-foreground">of {formatCurrency(budgetAmount)}</span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${
                        percentage >= 100 ? 'bg-destructive/20' : 
                        percentage >= 80 ? 'bg-yellow-500/20' : 
                        'bg-primary/20'
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${status.color}`}>
                        {percentage.toFixed(0)}% used
                      </span>
                      {budgetAmount - spent > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(budgetAmount - spent)} left
                        </span>
                      ) : (
                        <span className="text-xs text-destructive font-medium">
                          {formatCurrency(spent - budgetAmount)} over
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this budget. You can always set it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
