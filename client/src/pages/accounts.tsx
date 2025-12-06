import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, CreditCard, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Accounts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "bank" as "bank" | "credit_card",
    bankName: "",
    accountNumber: "",
    balance: "",
    creditLimit: "",
  });
  const { toast } = useToast();

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/accounts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsDialogOpen(false);
      setFormData({ name: "", type: "bank", bankName: "", accountNumber: "", balance: "", creditLimit: "" });
      toast({ title: "Account added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add account", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Account deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete account", variant: "destructive" });
    },
  });

  const bankAccounts = accounts.filter(a => a.type === "bank");
  const creditCards = accounts.filter(a => a.type === "credit_card");

  const totalBalance = bankAccounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);
  const totalCreditUsed = creditCards.reduce((sum, a) => {
    const balance = parseFloat(a.balance || "0");
    return sum + (balance < 0 ? Math.abs(balance) : 0);
  }, 0);
  const totalCreditLimit = creditCards.reduce((sum, a) => sum + parseFloat(a.creditLimit || "0"), 0);

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
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-accounts-title">Accounts</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-account">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
              <DialogDescription>Add a new bank account or credit card to track</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div>
                <Label>Account Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., HDFC Savings"
                  data-testid="input-account-name"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v: "bank" | "credit_card") => setFormData({ ...formData, type: v })}>
                  <SelectTrigger data-testid="select-account-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input 
                  value={formData.bankName} 
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g., HDFC Bank"
                  data-testid="input-bank-name"
                />
              </div>
              <div>
                <Label>Account Number (last 4 digits)</Label>
                <Input 
                  value={formData.accountNumber} 
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="e.g., 1234"
                  maxLength={4}
                  data-testid="input-account-number"
                />
              </div>
              <div>
                <Label>Current Balance</Label>
                <Input 
                  type="number" 
                  value={formData.balance} 
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  placeholder="0"
                  data-testid="input-balance"
                />
              </div>
              {formData.type === "credit_card" && (
                <div>
                  <Label>Credit Limit</Label>
                  <Input 
                    type="number" 
                    value={formData.creditLimit} 
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    placeholder="0"
                    data-testid="input-credit-limit"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-account">
                {createMutation.isPending ? "Adding..." : "Add Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Credit Used</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totalCreditUsed)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(totalCreditLimit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Bank Accounts
        </h2>
        {bankAccounts.length > 0 ? (
          <div className="space-y-2">
            {bankAccounts.map((account) => (
              <Card key={account.id} data-testid={`card-account-${account.id}`}>
                <CardContent className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.bankName} {account.accountNumber ? `•• ${account.accountNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-green-600">{formatCurrency(parseFloat(account.balance || "0"))}</p>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(account.id)}
                      data-testid={`button-delete-account-${account.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              No bank accounts added
            </CardContent>
          </Card>
        )}
      </div>

      {/* Credit Cards */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Credit Cards
        </h2>
        {creditCards.length > 0 ? (
          <div className="space-y-2">
            {creditCards.map((card) => {
              const balance = parseFloat(card.balance || "0");
              const limit = parseFloat(card.creditLimit || "0");
              const used = balance < 0 ? Math.abs(balance) : 0;
              const available = limit - used;
              
              return (
                <Card key={card.id} data-testid={`card-credit-${card.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium">{card.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.bankName} {card.accountNumber ? `•• ${card.accountNumber}` : ""}
                        </p>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(card.id)}
                        data-testid={`button-delete-credit-${card.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Used: <span className="text-destructive font-medium">{formatCurrency(used)}</span></span>
                      <span className="text-muted-foreground">Available: <span className="text-green-600 font-medium">{formatCurrency(available)}</span></span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              No credit cards added
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
