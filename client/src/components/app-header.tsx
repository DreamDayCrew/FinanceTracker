import { Wallet } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 max-w-2xl mx-auto">
        <Wallet className="w-6 h-6" />
        <h1 className="text-lg font-bold" data-testid="text-app-title">My Tracker</h1>
      </div>
    </header>
  );
}
