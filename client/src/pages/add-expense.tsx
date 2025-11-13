import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertExpenseSchema, EXPENSE_CATEGORIES, type InsertExpense } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AddExpense() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertExpense) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/budgets?month=${currentMonth}&year=${currentYear}`] });
      toast({
        title: "Expense added",
        description: "Your transaction has been recorded successfully",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const suggestCategoryMutation = useMutation({
    mutationFn: (description: string) => 
      apiRequest("POST", "/api/expenses/suggest-category", { description }),
    onSuccess: (data: { category: string }) => {
      setSelectedCategory(data.category);
      form.setValue("category", data.category);
      toast({
        title: "Category suggested",
        description: `AI suggests: ${data.category}`,
      });
    },
  });

  const handleAiSuggest = async () => {
    const description = form.getValues("description");
    if (!description || description.trim().length < 3) {
      toast({
        title: "Enter a description",
        description: "Please enter what you spent on to get AI suggestions",
        variant: "destructive",
      });
      return;
    }
    
    setIsAiSuggesting(true);
    try {
      await suggestCategoryMutation.mutateAsync(description);
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const onSubmit = (data: InsertExpense) => {
    createMutation.mutate(data);
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

  const watchedCategory = form.watch("category");

  return (
    <div className="flex flex-col p-4 pb-24">
      <h1 className="text-2xl font-semibold text-foreground mb-6" data-testid="text-add-expense-title">
        Add Expense
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount Input */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="pl-10 text-2xl font-semibold h-16"
                      data-testid="input-amount"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description Input */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="What did you spend on?"
                    className="resize-none"
                    rows={3}
                    data-testid="input-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* AI Suggest Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleAiSuggest}
            disabled={isAiSuggesting || suggestCategoryMutation.isPending}
            data-testid="button-ai-suggest"
          >
            <Sparkles className="w-4 h-4" />
            {isAiSuggesting || suggestCategoryMutation.isPending ? "Suggesting..." : "AI Suggest Category"}
          </Button>

          {/* Category Selection */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPENSE_CATEGORIES.map((category) => {
                      const isSelected = field.value === category;
                      return (
                        <Card
                          key={category}
                          className={`p-4 cursor-pointer transition-all hover-elevate ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'border-border'
                          }`}
                          onClick={() => {
                            field.onChange(category);
                            setSelectedCategory(category);
                          }}
                          data-testid={`category-option-${category}`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className={`material-icons text-2xl ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>
                              {getCategoryIcon(category)}
                            </span>
                            <span className="text-xs font-medium text-center">{category}</span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Input */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      {...field}
                      type="date"
                      className="pl-10"
                      max={new Date().toISOString().split('T')[0]}
                      data-testid="input-date"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setLocation("/")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
              data-testid="button-save-expense"
            >
              {createMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
