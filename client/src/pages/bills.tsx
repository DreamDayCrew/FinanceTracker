import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Trash2, AlertCircle } from "lucide-react";
import { insertBillSchema, EXPENSE_CATEGORIES, type Bill, type InsertBill } from "@shared/schema";
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

export default function Bills() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const form = useForm<InsertBill>({
    resolver: zodResolver(insertBillSchema),
    defaultValues: {
      name: "",
      amount: "",
      dueDate: 1,
      category: "",
      isRecurring: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertBill) => apiRequest("POST", "/api/bills", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Bill added",
        description: "Your bill reminder has been created",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Bill deleted",
        description: "Bill reminder has been removed",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBill) => {
    createMutation.mutate(data);
  };

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

  const getDaysUntilDue = (dueDate: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let targetDate = new Date(currentYear, currentMonth, dueDate);
    
    if (currentDay > dueDate) {
      targetDate = new Date(currentYear, currentMonth + 1, dueDate);
    }
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const sortedBills = [...bills].sort((a, b) => {
    const daysA = getDaysUntilDue(a.dueDate);
    const daysB = getDaysUntilDue(b.dueDate);
    return daysA - daysB;
  });

  const upcomingBills = sortedBills.filter(bill => getDaysUntilDue(bill.dueDate) <= 7);
  const totalUpcoming = upcomingBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-bills-title">
          Bills & Reminders
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-bill">
              <Plus className="w-4 h-4" />
              Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bill Reminder</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Netflix, Electricity"
                          data-testid="input-bill-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            {...field}
                            type="number"
                            step="1"
                            placeholder="0"
                            className="pl-8"
                            data-testid="input-bill-amount"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Day of Month)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-due-date">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bill-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    data-testid="button-save-bill"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Bill"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Alert */}
      {upcomingBills.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5" data-testid="card-upcoming-alert">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {upcomingBills.length} {upcomingBills.length === 1 ? 'bill' : 'bills'} due this week
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {formatCurrency(totalUpcoming)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills List */}
      {bills.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="material-icons text-muted-foreground text-4xl">notifications</span>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No bill reminders</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add reminders for recurring bills and subscriptions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBills.map((bill) => {
            const daysUntil = getDaysUntilDue(bill.dueDate);
            const isDueSoon = daysUntil <= 3;

            return (
              <Card 
                key={bill.id} 
                className={`overflow-hidden ${isDueSoon ? 'border-yellow-500/50' : ''}`}
                data-testid={`bill-card-${bill.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-icons text-primary text-xl">
                          {getCategoryIcon(bill.category)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{bill.name}</p>
                          {bill.isRecurring === 1 && (
                            <Badge variant="secondary" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{bill.category}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(parseFloat(bill.amount))}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className={`text-xs font-medium ${isDueSoon ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {daysUntil === 0 ? 'Due today' : 
                             daysUntil === 1 ? 'Due tomorrow' : 
                             daysUntil < 0 ? `Overdue by ${Math.abs(daysUntil)} days` :
                             `Due in ${daysUntil} days`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(bill.id)}
                      className="flex-shrink-0"
                      data-testid={`button-delete-bill-${bill.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
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
            <AlertDialogTitle>Delete Bill Reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this bill reminder. You can always add it again later.
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
