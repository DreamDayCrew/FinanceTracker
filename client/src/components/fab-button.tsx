import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function FabButton() {
  const [, setLocation] = useLocation();

  return (
    <Button
      size="icon"
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      onClick={() => setLocation("/add-transaction")}
      data-testid="fab-add-transaction"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
