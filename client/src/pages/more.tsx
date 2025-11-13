import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Database, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@shared/schema";

export default function More() {
  const { toast } = useToast();

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'pdf') => {
      const response = await apiRequest("POST", "/api/export", { format });
      return await response.json();
    },
    onSuccess: (data: { content: string, filename: string, format: string }) => {
      // Create download link
      const blob = new Blob([data.content], { 
        type: data.format === 'csv' ? 'text/csv' : 'text/plain' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Your data has been exported to ${data.format.toUpperCase()}`,
      });
    },
    onError: (error: any) => {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <h1 className="text-2xl font-semibold text-foreground" data-testid="text-more-title">
        More
      </h1>

      {/* App Info */}
      <Card data-testid="card-app-info">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            About FinArt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="material-icons text-primary-foreground text-3xl">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">FinArt Expense Tracker</h3>
              <p className="text-sm text-muted-foreground">AI-powered finance manager</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your expenses, manage budgets, and get insights into your spending with smart AI categorization.
          </p>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card data-testid="card-export">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export your financial data for backup or analysis
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => exportMutation.mutate('csv')}
              disabled={exportMutation.isPending || expenses.length === 0}
              data-testid="button-export-csv"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => exportMutation.mutate('pdf')}
              disabled={exportMutation.isPending || expenses.length === 0}
              data-testid="button-export-pdf"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
          {expenses.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Add some expenses first to enable export
            </p>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card data-testid="card-statistics">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="w-4 h-4" />
            Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Transactions</span>
            <span className="text-sm font-semibold text-foreground">{expenses.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Storage</span>
            <span className="text-sm font-semibold text-foreground">Local Device</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Data Status</span>
            <span className="text-sm font-semibold text-primary">Private & Secure</span>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Note */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            🔒 Your financial data is stored locally on your device and never shared with third parties. 
            AI categorization uses minimal data and respects your privacy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
