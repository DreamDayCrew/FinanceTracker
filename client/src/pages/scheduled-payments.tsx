import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Calendar, Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ScheduledPayment, Category } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ScheduledPayments() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    dueDate: 1,
    categoryId: "",
    notes: "",
    status: "active" as "active" | "inactive",
  });

  const { data: payments = [], isLoading } = useQuery<ScheduledPayment[]>({
    queryKey: ["/api/scheduled-payments"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/scheduled-payments", {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsDialogOpen(false);
      setFormData({ name: "", amount: "", dueDate: 1, categoryId: "", notes: "", status: "active" });
      toast({ title: "Scheduled payment added" });
    },
    onError: () => {
      toast({ title: "Failed to add payment", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/scheduled-payments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Payment status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update payment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/scheduled-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Payment deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete payment", variant: "destructive" });
    },
  });

  const today = new Date().getDate();
  const activePayments = payments.filter(p => p.status === "active");
  const inactivePayments = payments.filter(p => p.status === "inactive");
  const totalMonthly = activePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-48" />
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
            <h1 className="text-lg font-semibold">Scheduled Payments</h1>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(totalMonthly)}/month</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-payment">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Scheduled Payment</DialogTitle>
              <DialogDescription>Set up a recurring payment reminder</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div>
                <Label>Payment Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Maid Salary, Netflix"
                  data-testid="input-payment-name"
                />
              </div>
              <div>
                <Label>Amount (INR)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g., 2000"
                  data-testid="input-payment-amount"
                />
              </div>
              <div>
                <Label>Due Date (Day of Month)</Label>
                <Select value={formData.dueDate.toString()} onValueChange={(v) => setFormData({ ...formData, dueDate: parseInt(v) })}>
                  <SelectTrigger data-testid="select-due-date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category (Optional)</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger data-testid="select-payment-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === "expense").map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes"
                  rows={2}
                  data-testid="input-payment-notes"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-payment">
                {createMutation.isPending ? "Saving..." : "Add Payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Active Payments */}
        {activePayments.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Active Payments ({activePayments.length})
            </h2>
            <div className="space-y-2">
              {activePayments.map((payment) => {
                const category = categories.find(c => c.id === payment.categoryId);
                const isDueSoon = payment.dueDate >= today && payment.dueDate <= today + 7;
                const isPastDue = payment.dueDate < today;

                return (
                  <Card key={payment.id} className={isDueSoon ? "border-yellow-500/50" : isPastDue ? "border-red-500/50" : ""} data-testid={`card-payment-${payment.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{payment.name}</p>
                            {isDueSoon && <Badge variant="secondary" className="text-yellow-600">Due Soon</Badge>}
                            {isPastDue && <Badge variant="destructive">Past Due</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Due on {payment.dueDate}th of every month
                            {category && ` • ${category.name}`}
                          </p>
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-destructive">{formatCurrency(parseFloat(payment.amount))}</p>
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={payment.status === "active"}
                              onCheckedChange={(checked) => updateMutation.mutate({ id: payment.id, status: checked ? "active" : "inactive" })}
                              data-testid={`switch-payment-${payment.id}`}
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(payment.id)}
                              data-testid={`button-delete-payment-${payment.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Payments */}
        {inactivePayments.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Inactive ({inactivePayments.length})
            </h2>
            <div className="space-y-2">
              {inactivePayments.map((payment) => (
                <Card key={payment.id} className="opacity-60" data-testid={`card-payment-inactive-${payment.id}`}>
                  <CardContent className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{payment.name}</p>
                      <p className="text-xs text-muted-foreground">Due on {payment.dueDate}th</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(payment.amount))}</p>
                      <Switch
                        checked={false}
                        onCheckedChange={() => updateMutation.mutate({ id: payment.id, status: "active" })}
                        data-testid={`switch-payment-inactive-${payment.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {payments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No scheduled payments yet</p>
              <p className="text-sm text-muted-foreground mb-4">Add recurring payments like rent, salaries, or subscriptions to get reminders</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
