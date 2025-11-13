import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
import { FabButton } from "@/components/fab-button";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import AddExpense from "@/pages/add-expense";
import Budgets from "@/pages/budgets";
import Bills from "@/pages/bills";
import More from "@/pages/more";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/add-expense" component={AddExpense} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/bills" component={Bills} />
      <Route path="/more" component={More} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const hideNavigation = location === "/add-expense";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        <Router />
      </div>
      {!hideNavigation && <FabButton />}
      {!hideNavigation && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppShell />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
