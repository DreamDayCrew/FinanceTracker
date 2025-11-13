import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function FabButton() {
  const [, setLocation] = useLocation();

  return (
    <Button
      size="icon"
      className="fixed right-4 z-40 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      onClick={() => setLocation("/add-expense")}
      data-testid="fab-add-expense"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
