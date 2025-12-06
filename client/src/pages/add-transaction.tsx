import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Account } from "@shared/schema";

export default function AddTransaction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    type: "debit" as "debit" | "credit",
    amount: "",
    categoryId: "",
    accountId: "",
    merchant: "",
    description: "",
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        accountId: data.accountId ? parseInt(data.accountId) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Transaction added successfully" });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ title: "Failed to add transaction", description: error.message, variant: "destructive" });
    },
  });

  const suggestCategoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/suggest-category", {
        merchant: formData.merchant,
        description: formData.description,
      });
      return response.json();
    },
    onSuccess: (data: { category: string }) => {
      const category = categories.find(c => c.name === data.category);
      if (category) {
        setFormData({ ...formData, categoryId: category.id.toString() });
        toast({ title: `Suggested: ${data.category}` });
      }
    },
    onError: () => {
      toast({ title: "Could not suggest category", variant: "destructive" });
    },
  });

  const expenseCategories = categories.filter(c => c.type === "expense");
  const incomeCategories = categories.filter(c => c.type === "income");
  const displayCategories = formData.type === "debit" ? expenseCategories : incomeCategories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast({ title: "Please enter an amount", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button size="icon" variant="ghost" onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add Transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4">
        {/* Transaction Type Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={formData.type === "debit" ? "default" : "outline"}
            className={formData.type === "debit" ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => setFormData({ ...formData, type: "debit", categoryId: "" })}
            data-testid="button-type-debit"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Expense
          </Button>
          <Button
            type="button"
            variant={formData.type === "credit" ? "default" : "outline"}
            className={formData.type === "credit" ? "bg-green-600 hover:bg-green-700" : ""}
            onClick={() => setFormData({ ...formData, type: "credit", categoryId: "" })}
            data-testid="button-type-credit"
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Income
          </Button>
        </div>

        {/* Amount */}
        <Card>
          <CardContent className="pt-4">
            <Label className="text-muted-foreground">Amount (INR)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="text-3xl font-bold h-16 pl-10"
                placeholder="0"
                data-testid="input-amount"
              />
            </div>
          </CardContent>
        </Card>

        {/* Merchant/Description */}
        <div className="space-y-3">
          <div>
            <Label>Merchant / Payee</Label>
            <Input
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
              placeholder="e.g., Amazon, Swiggy, HDFC Bank"
              data-testid="input-merchant"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this for?"
              rows={2}
              data-testid="input-description"
            />
          </div>
        </div>

        {/* AI Suggest Category */}
        {(formData.merchant || formData.description) && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => suggestCategoryMutation.mutate()}
            disabled={suggestCategoryMutation.isPending}
            data-testid="button-ai-suggest"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {suggestCategoryMutation.isPending ? "Suggesting..." : "AI Suggest Category"}
          </Button>
        )}

        {/* Category */}
        <div>
          <Label>Category</Label>
          <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
            <SelectTrigger data-testid="select-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {displayCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account */}
        <div>
          <Label>Account</Label>
          <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
            <SelectTrigger data-testid="select-account">
              <SelectValue placeholder="Select account (optional)" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id.toString()}>
                  {acc.name} ({acc.type === "credit_card" ? "Credit Card" : "Bank"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={formData.transactionDate}
            onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
            data-testid="input-date"
          />
        </div>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full h-12 text-lg"
          disabled={createMutation.isPending}
          data-testid="button-save-transaction"
        >
          {createMutation.isPending ? "Saving..." : "Save Transaction"}
        </Button>
      </form>
    </div>
  );
}
