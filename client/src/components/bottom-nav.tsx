import { Link, useLocation } from "wouter";
import { Home, Receipt, PieChart, MoreHorizontal } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Dashboard", testId: "nav-dashboard" },
    { path: "/transactions", icon: Receipt, label: "Transactions", testId: "nav-transactions" },
    { path: "/budgets", icon: PieChart, label: "Budgets", testId: "nav-budgets" },
    { path: "/more", icon: MoreHorizontal, label: "More", testId: "nav-more" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex-1 max-w-[100px]"
            >
              <button
                className={`flex flex-col items-center justify-center w-full h-12 gap-1 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover-elevate'
                }`}
                data-testid={item.testId}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
