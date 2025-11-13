import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@shared/schema";

interface TransactionItemProps {
  expense: Expense;
}

export function TransactionItem({ expense }: TransactionItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/expenses/${expense.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Expense deleted",
        description: "Transaction has been removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <div 
        className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate group"
        data-testid={`transaction-${expense.id}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-icons text-primary text-xl">
              {getCategoryIcon(expense.category)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{expense.category}</p>
            {expense.description && (
              <p className="text-xs text-muted-foreground truncate">{expense.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(expense.date).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right mr-2">
            <p className="text-base font-semibold text-foreground">
              {formatCurrency(parseFloat(expense.amount))}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowDelete(true)}
            data-testid={`button-delete-${expense.id}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
