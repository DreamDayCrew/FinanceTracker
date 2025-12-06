import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
import { FabButton } from "@/components/fab-button";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Transactions from "@/pages/transactions";
import AddTransaction from "@/pages/add-transaction";
import More from "@/pages/more";
import Budgets from "@/pages/budgets";
import ScheduledPayments from "@/pages/scheduled-payments";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/add-transaction" component={AddTransaction} />
      <Route path="/more" component={More} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/scheduled-payments" component={ScheduledPayments} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const hideNavigation = location === "/add-transaction" || location === "/settings";

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
