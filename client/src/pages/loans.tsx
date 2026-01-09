import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Landmark, Calendar, TrendingDown, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LoanWithRelations, Account, LoanInstallment } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

const LOAN_TYPES = [
  { value: 'home_loan', label: 'Home Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'credit_card_loan', label: 'Credit Card Loan' },
  { value: 'item_emi', label: 'Product/Item EMI' },
];

interface LoanSummary {
  totalLoans: number;
  totalOutstanding: number;
  totalEmiThisMonth: number;
  nextEmiDue: { loanName: string; amount: string; dueDate: string } | null;
}

export default function Loans() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithRelations | null>(null);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    type: "personal_loan",
    lenderName: "",
    loanAccountNumber: "",
    principalAmount: "",
    interestRate: "",
    tenure: "",
    emiAmount: "",
    emiDay: "1",
    startDate: new Date().toISOString().split('T')[0],
    accountId: "",
  });

  const { data: loans = [], isLoading } = useQuery<LoanWithRelations[]>({
    queryKey: ["/api/loans"],
  });

  const { data: loanSummary } = useQuery<LoanSummary>({
    queryKey: ["/api/loan-summary"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        type: data.type,
        lenderName: data.lenderName || undefined,
        loanAccountNumber: data.loanAccountNumber || undefined,
        principalAmount: data.principalAmount,
        outstandingAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenure: parseInt(data.tenure),
        emiAmount: data.emiAmount || undefined,
        emiDay: parseInt(data.emiDay) || undefined,
        startDate: data.startDate,
        accountId: data.accountId ? parseInt(data.accountId) : undefined,
        status: "active" as const,
      };
      const response = await apiRequest("POST", "/api/loans", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-summary"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Loan added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add loan", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/loans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-summary"] });
      setSelectedLoan(null);
      toast({ title: "Loan deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete loan", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ installmentId, amount }: { installmentId: number; amount: string }) => {
      const response = await apiRequest("POST", `/api/loan-installments/${installmentId}/mark-paid`, {
        paidAmount: amount,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-summary"] });
      if (selectedLoan) {
        queryClient.invalidateQueries({ queryKey: ["/api/loans", selectedLoan.id] });
      }
      toast({ title: "EMI marked as paid" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to mark as paid", description: error.message, variant: "destructive" });
    },
  });

  const regenerateInstallmentsMutation = useMutation({
    mutationFn: async (loanId: number) => {
      const response = await apiRequest("POST", `/api/loans/${loanId}/regenerate-installments`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-summary"] });
      if (selectedLoan) {
        queryClient.invalidateQueries({ queryKey: ["/api/loans", selectedLoan.id] });
      }
      toast({ title: "Installments regenerated", description: "Pending EMIs have been recalculated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to regenerate", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "personal_loan",
      lenderName: "",
      loanAccountNumber: "",
      principalAmount: "",
      interestRate: "",
      tenure: "",
      emiAmount: "",
      emiDay: "1",
      startDate: new Date().toISOString().split('T')[0],
      accountId: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.principalAmount || !formData.interestRate || !formData.tenure || !formData.emiAmount) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const calculateProgress = (loan: LoanWithRelations): number => {
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    if (principal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((principal - outstanding) / principal) * 100)));
  };

  const getUpcomingInstallments = (loan: LoanWithRelations): LoanInstallment[] => {
    if (!loan.installments) return [];
    const now = new Date();
    return loan.installments
      .filter(i => i.status === 'pending' && new Date(i.dueDate) >= now)
      .slice(0, 6);
  };

  const getPaidInstallments = (loan: LoanWithRelations): LoanInstallment[] => {
    if (!loan.installments) return [];
    return loan.installments
      .filter(i => i.status === 'paid')
      .reverse()
      .slice(0, 12);
  };

  const getInstallmentStatus = (installment: LoanInstallment) => {
    if (installment.status === 'paid') {
      return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' };
    }
    const dueDate = new Date(installment.dueDate);
    const now = new Date();
    if (dueDate < now) {
      return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' };
    }
    return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' };
  };

  if (selectedLoan) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedLoan(null)}
            data-testid="button-back-loans"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-loan-name">{selectedLoan.name}</h1>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-loan-outstanding">
                  {formatCurrency(parseFloat(selectedLoan.outstandingAmount))}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {LOAN_TYPES.find(t => t.value === selectedLoan.type)?.label || selectedLoan.type}
              </Badge>
            </div>
            
            <Progress value={calculateProgress(selectedLoan)} className="h-2 mb-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{calculateProgress(selectedLoan)}% repaid</span>
              <span>of {formatCurrency(parseFloat(selectedLoan.principalAmount))}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Monthly EMI</p>
              <p className="text-lg font-semibold">{formatCurrency(parseFloat(selectedLoan.emiAmount || '0'))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="text-lg font-semibold">{selectedLoan.interestRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Tenure</p>
              <p className="text-lg font-semibold">{selectedLoan.tenure} months</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">EMI Date</p>
              <p className="text-lg font-semibold">{selectedLoan.emiDay || '-'}th</p>
            </CardContent>
          </Card>
        </div>

        {selectedLoan.lenderName && (
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Lender</p>
              <p className="font-medium">{selectedLoan.lenderName}</p>
              {selectedLoan.loanAccountNumber && (
                <p className="text-sm text-muted-foreground">Account: ****{selectedLoan.loanAccountNumber.slice(-4)}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="upcoming" className="flex-1" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="paid" className="flex-1" data-testid="tab-paid">Paid</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-2">
            {getUpcomingInstallments(selectedLoan).length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No upcoming installments
                </CardContent>
              </Card>
            ) : (
              getUpcomingInstallments(selectedLoan).map((installment) => {
                const status = getInstallmentStatus(installment);
                const StatusIcon = status.icon;
                return (
                  <Card key={installment.id} className={status.bg} data-testid={`card-installment-${installment.id}`}>
                    <CardContent className="py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        <div>
                          <p className="font-medium">EMI #{installment.installmentNumber}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(installment.dueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-semibold">{formatCurrency(parseFloat(installment.emiAmount))}</p>
                          <p className="text-xs text-muted-foreground">
                            P: {formatCurrency(parseFloat(installment.principalAmount || '0'))} | 
                            I: {formatCurrency(parseFloat(installment.interestAmount || '0'))}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markPaidMutation.mutate({ 
                            installmentId: installment.id, 
                            amount: installment.emiAmount 
                          })}
                          disabled={markPaidMutation.isPending}
                          data-testid={`button-mark-paid-${installment.id}`}
                        >
                          Pay
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
          
          <TabsContent value="paid" className="space-y-2">
            {getPaidInstallments(selectedLoan).length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No paid installments yet
                </CardContent>
              </Card>
            ) : (
              getPaidInstallments(selectedLoan).map((installment) => (
                <Card key={installment.id} className="bg-green-50 dark:bg-green-500/10" data-testid={`card-paid-${installment.id}`}>
                  <CardContent className="py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">EMI #{installment.installmentNumber}</p>
                        <p className="text-sm text-muted-foreground">Paid on {formatDate(installment.paidDate || installment.dueDate)}</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(parseFloat(installment.paidAmount || installment.emiAmount))}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => {
            if (confirm("Regenerate all pending installments? This will delete pending EMIs and recalculate them based on current loan terms. Paid installments will not be affected.")) {
              regenerateInstallmentsMutation.mutate(selectedLoan.id);
            }
          }}
          disabled={regenerateInstallmentsMutation.isPending}
          data-testid="button-regenerate-installments"
        >
          {regenerateInstallmentsMutation.isPending ? "Regenerating..." : "Regenerate Installments"}
        </Button>

        <Button 
          variant="destructive" 
          className="mt-4"
          onClick={() => {
            if (confirm("Delete this loan?")) {
              deleteMutation.mutate(selectedLoan.id);
            }
          }}
          disabled={deleteMutation.isPending}
          data-testid="button-delete-loan"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Loan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/more")}
          data-testid="button-back-more"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground" data-testid="text-loans-title">Loans & EMIs</h1>
      </div>

      {loanSummary && (
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm opacity-90">Total Outstanding</p>
                <p className="text-2xl font-bold" data-testid="text-total-outstanding">
                  {formatCurrency(loanSummary.totalOutstanding)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-sm opacity-80">Active Loans</p>
                <p className="text-lg font-semibold" data-testid="text-active-loans">{loanSummary.totalLoans}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">EMI This Month</p>
                <p className="text-lg font-semibold" data-testid="text-monthly-emi">{formatCurrency(loanSummary.totalEmiThisMonth)}</p>
              </div>
            </div>
            {loanSummary.nextEmiDue && (
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  Next: {loanSummary.nextEmiDue.loanName} - {formatCurrency(parseFloat(loanSummary.nextEmiDue.amount))} on {formatDate(loanSummary.nextEmiDue.dueDate)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Landmark className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No loans added yet</p>
            <p className="text-sm text-muted-foreground mb-4">Track your home loan, car loan, or EMIs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <Card 
              key={loan.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedLoan(loan)}
              data-testid={`card-loan-${loan.id}`}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-loan-name-${loan.id}`}>{loan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {LOAN_TYPES.find(t => t.value === loan.type)?.label || loan.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" data-testid={`text-loan-amount-${loan.id}`}>
                      {formatCurrency(parseFloat(loan.outstandingAmount))}
                    </p>
                    <p className="text-xs text-muted-foreground">remaining</p>
                  </div>
                </div>
                <Progress value={calculateProgress(loan)} className="h-1.5 mt-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{calculateProgress(loan)}% paid</span>
                  <span>EMI: {formatCurrency(parseFloat(loan.emiAmount || '0'))}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" data-testid="button-add-loan">
            <Plus className="w-4 h-4 mr-2" />
            Add Loan
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Loan</DialogTitle>
            <DialogDescription>Track your loan with EMI schedule</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Loan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Home Loan - SBI"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-loan-name"
              />
            </div>

            <div>
              <Label>Loan Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger data-testid="select-loan-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lenderName">Lender/Bank Name</Label>
              <Input
                id="lenderName"
                placeholder="e.g., State Bank of India"
                value={formData.lenderName}
                onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                data-testid="input-lender-name"
              />
            </div>

            <div>
              <Label htmlFor="principalAmount">Principal Amount (Rs) *</Label>
              <Input
                id="principalAmount"
                type="number"
                placeholder="e.g., 1000000"
                value={formData.principalAmount}
                onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                data-testid="input-principal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="interestRate">Interest Rate (%) *</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 8.5"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  data-testid="input-interest-rate"
                />
              </div>
              <div>
                <Label htmlFor="tenure">Tenure (months) *</Label>
                <Input
                  id="tenure"
                  type="number"
                  placeholder="e.g., 60"
                  value={formData.tenure}
                  onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                  data-testid="input-tenure"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emiAmount">Monthly EMI (Rs) *</Label>
                <Input
                  id="emiAmount"
                  type="number"
                  placeholder="e.g., 20000"
                  value={formData.emiAmount}
                  onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                  data-testid="input-emi-amount"
                />
              </div>
              <div>
                <Label htmlFor="emiDay">EMI Due Day *</Label>
                <Select value={formData.emiDay} onValueChange={(value) => setFormData({ ...formData, emiDay: value })}>
                  <SelectTrigger data-testid="select-emi-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>

            {accounts.length > 0 && (
              <div>
                <Label>Link to Account (optional)</Label>
                <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
                  <SelectTrigger data-testid="select-account">
                    <SelectValue placeholder="Select account for auto-debit" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              data-testid="button-submit-loan"
            >
              {createMutation.isPending ? "Adding..." : "Add Loan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
